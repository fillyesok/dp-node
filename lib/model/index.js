const engine = require('./engine');

module.exports = (config) => {
    var delegate = {
        row: engine.row,
        rows: engine.rows,
        tran: engine.tran,
        execute: engine.execute
    };

    var loader = require('../loader')(delegate, config.cfg.apppath + '/model');

    return loader;
};