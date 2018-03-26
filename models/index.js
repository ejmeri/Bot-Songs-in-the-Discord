require('dotenv').load();

const mysql = require('../database/mysql');
const option = require('../database/option').mysql; // NUNCA ESQUECER DE TROCAR

if (!global.hasOwnProperty('db')) {
	var Sequelize = require('sequelize'),
		sequelize = null

	if (option) {
		// the application is executed on Heroku ... use the postgres database

		console.log('Heroku database');

		sequelize = new Sequelize(process.env.HEROKU_POSTGRESQL_BRONZE_URL, {
			dialect: 'postgres',
			protocol: 'postgres',
			port: '5432',
			host: 'ec2-54-243-239-66.compute-1.amazonaws.com',
			logging: true //false
		})
	} else {
		// the application is executed on the local machine ... use mysql
		console.log('mysql database')
		sequelize = new Sequelize(mysql.database, mysql.username, mysql.password, mysql.params);
	}

	global.db = {
		Sequelize: Sequelize,
		sequelize: sequelize,
		Playlist: sequelize.import(__dirname + '/playlist'),
		Command: sequelize.import(__dirname + '/command')
		// add your other models here
	}

	/*
	  Associations can be defined here. E.g. like this:
	  global.db.User.hasMany(global.db.SomethingElse)
	*/
}

module.exports = global.db