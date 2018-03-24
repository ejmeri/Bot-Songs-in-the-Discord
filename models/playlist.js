module.exports = function (sequelize, DataTypes) {
    return sequelize.define("Playlist", {
        id: {
            type: DataType.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        url: {
            type: DataTypes.STRING,
        } 
    });
};