"""Build the SIOSE coverage mask from the IGN SignA administrative units.

Supply GeoJSON FeatureCollections with all 19 codine units from layer 17:
https://certiserviciosgis.ign.es/servicios/rest/services/signa/Unidades_Administrativas/MapServer/17
Query parameters: f=geojson, outFields=codine, outSR=4326,
maxAllowableOffset=.00015, and where=codine='01' (repeat for 01–19).
The mask is an approximation for the selector. SIOSE polygons come from the
edition service directly and retain their source geometry.
"""

import argparse
import gzip
import json
import runpy
from pathlib import Path
from tempfile import TemporaryDirectory

from shapely import make_valid, union_all
from shapely.geometry import MultiPolygon, Polygon, mapping, shape


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('output', type=Path)
    parser.add_argument('sources', type=Path, nargs='+')
    args = parser.parse_args()

    units = {}
    for path in args.sources:
        features = json.loads(path.read_text(encoding='utf-8'))['features']
        for feature in features:
            code = feature['properties']['codine']
            if code in units:
                parser.error(f'Duplicate IGN unit {code}')
            units[code] = make_valid(shape(feature['geometry']))
    if set(units) != {f'{code:02d}' for code in range(1, 20)}:
        parser.error('Expected all 19 IGN units with codine codes 01–19')

    packager = runpy.run_path(str(Path(__file__).with_name('package-urban-cover.py')))
    boundary = union_all([units[code] for code in sorted(units)], grid_size=.00001)
    parts = list(packager['polygons'](boundary))
    if not parts:
        parser.error('Empty coverage boundary')
    # The source outlines are generalised per unit. Fill sub-hectare slivers
    # between them before generating the mask.
    geometry = MultiPolygon([Polygon(part.exterior, [ring for ring in part.interiors
                                                     if Polygon(ring).area > .000001])
                             for part in parts])
    with TemporaryDirectory() as directory:
        root = Path(directory)
        (root / 'coverage.json.gz').write_bytes(gzip.compress(json.dumps(mapping(geometry)).encode(), mtime=0))
        packager['web_coverage'](root, args.output)


if __name__ == '__main__':
    main()
