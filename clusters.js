var cluster = require('cluster');
var os = require('os');


const CPUS = os.cpus();

if (cluster.isMaster) {
    CPUS.forEach(() => cluster.fork());

    cluster.on('listening', worker => {
        console.log("Cluster %d conectado", worker.process.id);
    });
    cluster.on('disconnect', worker => {
        console.log("Cluster %d conectado", worker.process.id);
    });
    cluster.on('exit', worker => {
        console.log("Cluster %d conectado", worker.process.id);
        cluster.fork();
        //garante que um novo cluster inicie, caso um antigo morra
    });
} else {
    require('./app');
}