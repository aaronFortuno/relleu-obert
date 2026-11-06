"""Prepare and measure a static index of ICGC urban land-cover polygons.

Offline dependencies: Python 3.11+, Shapely 2.1+, pyproj.
Inputs are ICGC GeoPackages, their official ZIPs, or bounded ICGC GeoJSON extracts.
"""

import argparse
from contextlib import closing, contextmanager
import gzip
from itertools import product
import json
from math import ceil, floor
from pathlib import Path
import shutil
import sqlite3
from tempfile import TemporaryDirectory
from zipfile import ZipFile

from pyproj import Transformer
import shapely
from shapely.geometry import box, mapping, shape


TILES_PER_DEGREE = 16
URBAN_CLASSES = (341, 342, 343, 344, 345, 347)
SOURCE = 'https://www.icgc.cat/ca/Geoinformacio-i-mapes/Mapes/Mapa-de-cobertes-del-sol-de-Catalunya'
TO_EQUAL_AREA = Transformer.from_crs(4326, 3035, always_xy=True).transform


def tile_keys(bounds):
    west, south, east, north = bounds
    return product(range(floor(west * TILES_PER_DEGREE), ceil(east * TILES_PER_DEGREE)),
                   range(floor(south * TILES_PER_DEGREE), ceil(north * TILES_PER_DEGREE)))


def valid_bounds(bounds):
    west, south, east, north = bounds
    return -180 <= west < east <= 180 and -90 <= south < north <= 90


def polygons(geometry):
    if geometry.is_empty:
        return
    if geometry.geom_type == 'Polygon':
        yield geometry
    elif hasattr(geometry, 'geoms'):
        for part in geometry.geoms:
            yield from polygons(part)


def geojson(geometry, cover_class):
    return json.dumps({'type': 'Feature', 'properties': {'coverClass': cover_class},
                       'geometry': mapping(geometry)}, separators=(',', ':'), allow_nan=False)


def unpack_geometry(blob):
    if blob[:2] != b'GP':
        raise ValueError('Expected GeoPackage geometry')
    envelope = (blob[3] >> 1) & 7
    return shapely.from_wkb(blob[8 + (0, 32, 48, 48, 64)[envelope]:])


@contextmanager
def geopackage(path):
    if path.suffix.lower() != '.zip':
        yield path
        return
    with TemporaryDirectory(prefix='relleu-urban-gpkg-') as temp, ZipFile(path) as archive:
        files = [name for name in archive.namelist() if name.lower().endswith('.gpkg')]
        if len(files) != 1:
            raise ValueError(f'Expected one GeoPackage in {path}')
        target = Path(temp, 'source.gpkg')
        with archive.open(files[0]) as source, target.open('wb') as output:
            shutil.copyfileobj(source, output, length=1024 * 1024)
        yield target


def quote(identifier):
    return '"' + identifier.replace('"', '""') + '"'


def source_features(path, bounds, year=None):
    if path.suffix.lower() == '.geojson':
        if bounds is None:
            raise ValueError('A GeoJSON extract requires explicit --bounds')
        data = json.loads(path.read_text(encoding='utf-8'))
        if (data.get('type') != 'FeatureCollection' or not data.get('bbox')
                or not box(*data['bbox']).covers(box(*bounds)) or data.get('edition') != year):
            raise ValueError(f'The extract does not match the edition and bounds: {path}')
        for feature in data['features']:
            cover_class = feature['properties']['coverClass']
            if cover_class in URBAN_CLASSES:
                yield cover_class, shapely.make_valid(shape(feature['geometry']))
        return
    with geopackage(path) as unpacked, closing(sqlite3.connect(unpacked.resolve().as_uri() + '?mode=ro', uri=True)) as db:
        candidates = db.execute('SELECT table_name, column_name, srs_id FROM gpkg_geometry_columns')
        for table, column, srs_id in candidates:
            fields = list(db.execute(f'PRAGMA table_info({quote(table)})'))
            if any(field[1] == 'nivell_2' for field in fields):
                break
        else:
            raise ValueError(f'Urban class field not found in {path}')
        if srs_id not in (25831, 4326):
            raise ValueError(f'Unsupported coordinate system EPSG:{srs_id}')
        convert = Transformer.from_crs(srs_id, 4326, always_xy=True).transform
        classes = ','.join('?' for _ in URBAN_CLASSES)
        sql = f'SELECT nivell_2, {quote(column)} FROM {quote(table)} WHERE nivell_2 IN ({classes})'
        parameters = URBAN_CLASSES
        if bounds:
            projected = Transformer.from_crs(4326, srs_id, always_xy=True).transform_bounds(*bounds)
            west, south, east, north = projected
            primary_key = next(field[1] for field in fields if field[5] == 1)
            spatial_index = quote(f'rtree_{table}_{column}')
            sql += (f' AND {quote(primary_key)} IN (SELECT id FROM {spatial_index}'
                    ' WHERE maxx >= ? AND maxy >= ? AND minx <= ? AND miny <= ?)')
            parameters += (west, south, east, north)
        for cover_class, blob in db.execute(sql, parameters):
            geometry = unpack_geometry(blob)
            if not geometry.is_valid:
                geometry = shapely.make_valid(geometry)
            yield cover_class, shapely.transform(geometry, convert, interleaved=False)


def pack_edition(year, source, root, bounds):
    directory = root / str(year)
    directory.mkdir()
    buffers = {}
    buffered = 0
    count = 0

    def flush():
        for key, lines in buffers.items():
            with (directory / f'{key}.ndjson').open('a', encoding='utf-8') as output:
                output.writelines(lines)
        buffers.clear()

    limit = box(*bounds) if bounds else None
    for cover_class, geometry in source_features(source, bounds, year):
        # WGS84 simplification is approximately one metre or less in Catalunya.
        geometry = shapely.simplify(geometry, 0.00001, preserve_topology=True)
        if limit is not None:
            geometry = geometry.intersection(limit)
        if geometry.is_empty or geometry.area <= 0:
            continue
        count += 1
        for x, y in tile_keys(geometry.bounds):
            step = TILES_PER_DEGREE
            cell = box(x / step, y / step, (x + 1) / step, (y + 1) / step)
            clipped = shapely.intersection(geometry, cell, grid_size=0.0000001)
            for part in polygons(clipped):
                line = geojson(part, cover_class) + '\n'
                buffers.setdefault(f'{x}-{y}', []).append(line)
                buffered += len(line)
        if buffered >= 4_000_000:
            flush()
            buffered = 0
    flush()
    if not count and bounds is None:
        raise ValueError(f'No urban polygons read from {source}')

    sizes = {}
    for spool in sorted(directory.glob('*.ndjson')):
        target = spool.with_suffix('.json.gz')
        with target.open('wb') as compressed:
            with gzip.GzipFile(filename='', fileobj=compressed, mode='wb', mtime=0) as output:
                output.write(b'{"type":"FeatureCollection","features":[')
                with spool.open('rb') as lines:
                    for index, line in enumerate(lines):
                        if index:
                            output.write(b',')
                        output.write(line.rstrip(b'\r\n'))
                output.write(b']}')
        sizes[spool.stem] = target.stat().st_size
        spool.unlink()
    result = {'year': year, 'tiles': sizes, 'sourcePolygons': count, 'bytes': sum(sizes.values())}
    print(f'{year}: {count:,} polígons, {len(sizes)} cel·les, {result["bytes"]:,} bytes', flush=True)
    return result


def compare(root, bounds):
    index = json.loads((root / 'index.json').read_text(encoding='utf-8'))
    if index['version'] != 1 or index['tilesPerDegree'] != TILES_PER_DEGREE:
        raise ValueError('Unsupported urban coverage index')
    clip = box(*bounds)
    analysis_bounds = index.get('analysisBounds')
    if analysis_bounds and not box(*analysis_bounds).covers(clip):
        raise ValueError('This index covers a test window only')
    covered_land = None
    if index.get('coverage'):
        with gzip.open(root / 'coverage.json.gz', 'rt', encoding='utf-8') as file:
            coverage = shape(json.load(file))
        covered_land = coverage.intersection(clip)
        if covered_land.is_empty or covered_land.area <= 0:
            raise ValueError('The selection contains no land inside the ICGC boundary')
        clip = covered_land
    keys = [f'{x}-{y}' for x, y in tile_keys(bounds)]
    areas = []
    report = []
    for edition in index['editions']:
        year = edition['year']
        parts = []
        used = [key for key in keys if key in edition['tiles']]
        for key in used:
            with gzip.open(root / str(year) / f'{key}.json.gz', 'rt', encoding='utf-8') as source:
                for feature in json.load(source)['features']:
                    geometry = shape(feature['geometry'])
                    parts.extend(polygons(geometry.intersection(clip)))
        union = shapely.union_all(parts)
        equal_area = shapely.transform(union, TO_EQUAL_AREA, interleaved=False)
        areas.append(equal_area)
        report.append({'year': year, 'urbanHa': round(equal_area.area / 1e4, 2),
                       'tiles': len(used), 'bytes': sum(edition['tiles'][key] for key in used)})
    result = {'bbox': bounds, 'editions': report}
    if covered_land is not None:
        result['landInCataloniaHa'] = round(shapely.transform(covered_land, TO_EQUAL_AREA, interleaved=False).area / 1e4, 2)
    if len(areas) == 2:
        result['mappedGainHa'] = round(areas[1].difference(areas[0]).area / 1e4, 2)
        result['mappedLossHa'] = round(areas[0].difference(areas[1]).area / 1e4, 2)
    return result


def web_coverage(archive, output):
    with ZipFile(archive) as package:
        boundary = shape(json.loads(gzip.decompress(package.read('coverage.json.gz'))))
    # This compact mask describes coverage on the map. The edition tiles retain their source detail.
    boundary = shapely.set_precision(shapely.simplify(boundary, 0.00007, preserve_topology=True), 0.00001)
    shapely.prepare(boundary)
    full, partial = [], {}
    step = TILES_PER_DEGREE
    for x, y in tile_keys(boundary.bounds):
        key = f'{x}-{y}'
        cell = box(x / step, y / step, (x + 1) / step, (y + 1) / step)
        if boundary.covers(cell):
            full.append(key)
        elif boundary.intersects(cell):
            clipped = boundary.intersection(cell)
            parts = [mapping(part)['coordinates'] for part in polygons(clipped)]
            if parts:
                partial[key] = parts
    mask = {'tilesPerDegree': step, 'bbox': boundary.bounds, 'full': full, 'partial': partial}
    output.write_bytes(gzip.compress(json.dumps(mask, separators=(',', ':')).encode(), mtime=0))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    pack = commands.add_parser('pack')
    pack.add_argument('output', type=Path)
    pack.add_argument('sources', nargs='+', metavar='YEAR=FILE')
    pack.add_argument('--bounds', type=float, nargs=4, metavar=('W', 'S', 'E', 'N'))
    pack.add_argument('--boundary', type=Path, help='WGS84 ICGC boundary GeoJSON')
    crop = commands.add_parser('compare')
    crop.add_argument('index', type=Path)
    crop.add_argument('bounds', type=float, nargs=4, metavar=('W', 'S', 'E', 'N'))
    mask = commands.add_parser('web-coverage')
    mask.add_argument('archive', type=Path)
    mask.add_argument('output', type=Path)
    args = parser.parse_args()
    if args.command == 'web-coverage':
        web_coverage(args.archive, args.output)
        return
    if args.command == 'compare':
        if not valid_bounds(args.bounds):
            parser.error('Invalid WGS84 bounds')
        print(json.dumps(compare(args.index, args.bounds), indent=2))
        return
    try:
        sources = sorted((int(year), Path(path)) for year, path in (value.split('=', 1) for value in args.sources))
    except ValueError:
        parser.error('Use YEAR=FILE for each edition')
    if len({year for year, _ in sources}) != len(sources) or any(not path.is_file() for _, path in sources):
        parser.error('Supply a different year and an existing archive for each edition')
    if args.bounds and not valid_bounds(args.bounds):
        parser.error('Invalid WGS84 bounds')
    args.output.mkdir()
    editions = [pack_edition(year, source, args.output, args.bounds) for year, source in sources]
    index = {'version': 1, 'tilesPerDegree': TILES_PER_DEGREE,
             'source': SOURCE, 'attribution': 'Institut Cartogràfic i Geològic de Catalunya',
             'license': 'CC BY 4.0', 'editions': editions}
    if args.bounds:
        index['analysisBounds'] = args.bounds
    if args.boundary:
        features = json.loads(args.boundary.read_text(encoding='utf-8'))['features']
        boundary_parts = []
        for feature in features:
            geometry = shape(feature['geometry'])
            if args.bounds:
                geometry = shapely.clip_by_rect(geometry, *args.bounds)
            if not geometry.is_valid:
                geometry = shapely.make_valid(geometry)
            boundary_parts.extend(polygons(geometry))
        boundary = shapely.union_all(boundary_parts)
        if boundary.is_empty or not boundary.is_valid:
            raise ValueError('Invalid ICGC coverage boundary')
        (args.output / 'coverage.json.gz').write_bytes(gzip.compress(
            json.dumps(mapping(boundary), separators=(',', ':'), allow_nan=False).encode(), mtime=0))
        index['coverage'] = 'ICGC administrative land boundary, WGS84'
    (args.output / 'index.json').write_text(json.dumps(index, separators=(',', ':')) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
