# Catalogue roof crop regression

`santa-maria-roof-pre-cleanup.glb` is the 112,280-byte pre-cleanup draft of Open Place Models' synthetic Santa Maria del Mar reconstruction (SHA-256 `85658091ed79ebd0cc3705a583731bde2bd66c37559efba36c96d7ccbaf4492a`). It is retained deliberately: its exported Float32 coordinates contain collapsed triangles, while its visible terrace remains planar. Default coplanar grouping during a crop changed that terrace by more than 2.5 mm in the reproduced 1:1,000 print frame. The test reads roof heights directly from the original and clipped triangle arrays.

Original geometry: Open Place Models contributors, **CC BY 4.0**. Municipal/ICGC-derived geometry retains CC BY 4.0 attribution; OSM-derived plan and registration retain ODbL 1.0 attribution. No photographs, third-party mesh or reference drawings are included. The fixture is a regression input, not a catalogue release or a model to recommend for printing.

- [Model, source measurements and limitations](https://github.com/aaronFortuno/open-place-models/tree/main/models/santa-maria-del-mar/r1)
- [Municipal 3D source](https://portaldades.ajuntament.barcelona.cat/mapes/146)
- [ICGC elevations](https://geoserveis.icgc.cat/servei/catalunya/elevacions-territorial/wms)
- [OSM basilica](https://www.openstreetmap.org/way/51260215), [rear chapel](https://www.openstreetmap.org/way/217516630)
- [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), [OSM attribution](https://www.openstreetmap.org/copyright)
