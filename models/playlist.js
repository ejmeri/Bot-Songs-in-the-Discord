module.exports = function(sequelize, DataTypes) {
    return sequelize.define("Playlist", {
      url: DataTypes.STRING
    });
};