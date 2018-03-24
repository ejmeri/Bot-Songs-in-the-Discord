module.exports = function (sequelize, DataTypes) {
    return sequelize.define("Playlist", {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        url: {
            type: DataTypes.STRING,
        } 
    });
};