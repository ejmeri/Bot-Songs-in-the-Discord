module.exports = function (sequelize, DataTypes) {
    return sequelize.define("Command", {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING,
        },
        userid: {
            type: DataTypes.BIGINT,
        },
        username: {
            type: DataTypes.STRING,
        }
    });
};