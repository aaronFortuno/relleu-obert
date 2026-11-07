import {PYRENEES_COVERAGE,PYRENEES_COVERAGE_FILE} from '../src/relief-coverage.js';
import {prepareRegionalWorldCover} from './prepare-regional-worldcover.mjs';

await prepareRegionalWorldCover(PYRENEES_COVERAGE,PYRENEES_COVERAGE_FILE);
