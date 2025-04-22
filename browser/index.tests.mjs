import {Logger} from '../src/logger.mjs';

const logger = new Logger();

function test(calls = 10) {
    if (calls) {
        return test(calls - 1);
    }

    logger.log('test');
    logger.info('test');
    logger.warn('test');
    logger.error('test');
}

test()