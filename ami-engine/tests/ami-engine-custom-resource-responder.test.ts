import * as nock from 'nock';
import {run} from '../src/ami-engine-custom-resource-responder.js';

import ec2Nock from './nocks/ec2.nock';

nock.disableNetConnect();

