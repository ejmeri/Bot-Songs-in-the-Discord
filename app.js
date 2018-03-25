const {
    Client,
    Util
} = require('discord.js');
const {
    TOKEN,
    PREFIX,
    PREFIX_HOMO,
    GOOGLE_API_KEY,
    VOLUME, 
    TOKEN_HOMO
} = require('./config');
const YouTube = require('simple-youtube-api');
const ytdl = require('ytdl-core');
const client = new Client({
    disableEveryone: true
});
const youtube = new YouTube(GOOGLE_API_KEY);
const queue = new Map();

let lineReader = require('line-reader');


require('dotenv').load();

var db = require('./models');

var playlist = require('./models/playlist');

client.on('warn', console.warn);
client.on('error', console.error);

db.sequelize.sync().then(function () {
    client.on('ready', async () => {
        console.log('Só vai, to a mil aqui já!');
        client.user.setActivity('Pronto para tocar');


        // console.log(await songlist());
        // db.Playlist.findAll().then((song) => {
        //     console.log(song);
        // });

        // lineReader.eachLine('autoplaylist.txt', function (line, last) {

        //     db.Playlist.create({url:line}).then((err) => {
        //         if(err) console.log(err);
        //     });

        //     if (last) {
        //         return false; // stop reading
        //     }
        // });

    });
});

client.on('disconnect', () => console.log('Disconectei pai...'));
client.on('reconnecting', () => console.log('To reconectando.. perai!'));



client.on('message', async message => {
    if (message.author.bot) return console.log('Bot ->', message.author.bot);
    if (!message.content.startsWith(PREFIX_HOMO)) return console.log('Porra ELMERI! Commando errado ->', undefined);

    const args = message.content.split(' ');
    const searchString = args.slice(1).join(' ');
    const url = args[1] ? args[1].replace(/<(.+)>/g, '$1') : '';
    const serverQueue = queue.get(message.guild.id);
    const voiceChannel = message.member.voiceChannel;


    let command = message.content.toLowerCase().split(' ')[0];
    command = command.slice(PREFIX_HOMO.length);

    if (command === 'tocar') {

        if (!voiceChannel) return message.channel.send('Não encontrei o canal de voz');

        const permissions = voiceChannel.permissionsFor(message.client.user);

        if (!permissions.has('CONNECT')) {
            return message.channel.send('NAO POSSO CONECTAR. Reveja suas permissões');
        }

        if (!permissions.has('SPEAK')) {
            return message.channel.send('NAO POSSO FALAR AQUI? Reveja suas permissões');
        }

        try {
            var video = await youtube.getVideo(url);  
        } catch (error) {
            try {
                var videos = await youtube.searchVideos(searchString, 5);
                let index = 0;
                message.channel.send(`__**Escolha uma música ae:**__ \n\n ${videos.map(video2 => `**${++index} -** ${video2.title}`).join('\n')} \n\n Escolha o número da música ae pa nois.`); // eslint-disable-next-line max-depth

                try {
                    var response = await message.channel.awaitMessages(message2 => message2.content > 0 && message2.content < 11, {
                        maxMatches: 1,
                        time: 10000,
                        errors: ['time']
                    });
                } catch (err) {
                    console.error(err);
                    return message.channel.send('Não selecionou? Cancelando aqui então, faloste.');
                }
                const videoIndex = parseInt(response.first().content);
                var video = await youtube.getVideoByID(videos[videoIndex - 1].id);
            } catch (err) {
                return message.channel.send('🆘 Ih rapaz... Não achei nada aqui em. SORRY!');
            }
        }

        return handleVideo(video, message, voiceChannel, false);

    } else if (command === 'pular') {
        if (!message.member.voiceChannel) return message.channel.send('Voce não está no canal!');
        if (!message.member.voiceChannel) return msg.channel.send('You are not in a voice channel!');
        if (!serverQueue) return message.channel.send('Nem iniciei, vou pular o que?.');
        
        serverQueue.connection.dispatcher.end('Skip command has been used!');
        
        return undefined;

    } else if (command === 'parar') {
        if (!message.member.voiceChannel) return message.channel.send('Voce não está no canal!');
        
        if (!serverQueue) 
        {
            voiceChannel.leave();
        }
        else {
            serverQueue.voiceChannel.leave();
        }

        return undefined;

    } else if (command === 'volume') {

        if (!args[1] >= 30) return message.channel.send(`QUER FICAR SURDO?? (Volume máximo 30).\n\n Volume atual: **${serverQueue.volume}**`);
        if (!message.member.voiceChannel) return message.channel.send('VOCE NÃO TA NO CANAL');
        // if (!serverQueue) return message.channel.send('NÃO TEM NADA TOCANDO BB..');
        if (!args[1]) return message.channel.send(`Volume atual: **${serverQueue.volume}**`);

        if (serverQueue) {
            serverQueue.volume = args[1];
            serverQueue.connection.dispatcher.setVolumeLogarithmic(args[1] / 5);
        } else
            serverQueue.connection.dispatcher.setVolumeLogarithmic(args[1] / 5);

            return message.channel.send(`Novo volume: **${args[1]}**`);
    } else if (command === 'tocando') {
        if (!serverQueue) return message.channel.send('Como vai mostrar, se não tem nada pra tocar em???.');
        return message.channel.send(`🎶 Tocando agora: **${serverQueue.songs[0].title}**`);
    } else if (command === 'fila') {
        if (!serverQueue) return message.channel.send('TEM PORRA NENHUMA AQUI NÃO!');
        return message.channel.send(`__**Músicas da fila:**__ \n\n${serverQueue.songs.map(song => `**-** ${song.title}`).join('\n')} \n\n **Tocando agora: ** ${serverQueue.songs[0].title}`);

        // ${serverQueue.songs[0].title} tocando agora

    } else if (command === 'pausar') {
        // if (serverQueue && serverQueue.playing) {
        //     serverQueue.playing = false;
        //     serverQueue.connection.dispatcher.pause();
        //     return message.channel.send('⏸ TA PAUSADO!');
        // }

        // return message.channel.send('NÃO TEM NADA TOCANDO BB.');

        serverQueue.connection.dispatcher.pause();
        return message.channel.send('⏸ TA PAUSADO!');

    } else if (command === 'voltar') {
        // if (serverQueue && !serverQueue.playing) {
        //     serverQueue.playing = true;
        //     serverQueue.connection.dispatcher.resume();
        //     return message.channel.send('▶ AE PORRA, VOLTOU A FESTA!');
        // }
        // return message.channel.send('NÃO TEM NADA TOCANDO BB.');

        serverQueue.connection.dispatcher.resume();
        return message.channel.send('▶ AE PORRA, VOLTOU A FESTA!');
    } else if (command === 'nova') {

        var isLink = isYTLink(url);

        if (isLink) {
            if (await newsong(url) == true) {
                return message.channel.send(`✅ Música adicionada a sua playlist`);
            } else {
                return message.channel.send(`Esta url já foi adicionada`)
            }
            // const playlist = await youtube.getPlaylist(url);
            // const videos = await playlist.getVideos();
            // for (const video of Object.values(videos)) {
            //     const video2 = await youtube.getVideoByID(video.id); // eslint-disable-line no-await-in-loop
            //     await handleVideo(video2, message, voiceChannel, true); // eslint-disable-line no-await-in-loop
            // }
            // return message.channel.send(`✅ Playlist: **${playlist.title}** has been added to the queue!`);
        } else {
            return message.channel.send('🆘 Ih rapaz... LINK INVALIDO! 🆘🆘🆘🆘🆘');
        }
    } else if (command === 'summon') {  
        if (!message.member.voiceChannel) return message.channel.send('Voce não está no canal!');
        
        if (!serverQueue) 
        {
            try {
                var video = await youtube.getVideo(await songlist());
                handleVideo(video, message, voiceChannel);
            } catch (error) {
                console.log(error);
            }
            
        }

		return undefined;
    }

    return undefined;
});


async function handleVideo(video, message, voiceChannel, playlist = false) {
    console.log('chega aqui');
    
    const serverQueue = queue.get(message.guild.id);

    const song = {
        id: video.id,
        title: Util.escapeMarkdown(video.title),
        url: `https://www.youtube.com/watch?v=${video.id}`
    };

    if (!serverQueue) {

        const queueConstruct = {
            textChannel: message.channel,
            voiceChannel: voiceChannel,
            connection: null,
            songs: [],
            volume: VOLUME,
            playing: true
        };
        queue.set(message.guild.id, queueConstruct);

        queueConstruct.songs.push(song);

        try {
            var connection = await voiceChannel.join();
            queueConstruct.connection = connection;
            play(message.guild, queueConstruct.songs[0], message, voiceChannel);
        } catch (error) {
            console.error(`NÃO PUDE ENTRAR NO CANAL: ${error}`);
            queue.delete(message.guild.id);
            return message.channel.send(`NÃO PUDE ENTRAR NO CANAL: ${error}`);
        }
    } else {
        serverQueue.songs.push(song);
        
        if (playlist) return  serverQueue.connection.dispatcher.end('Skip command has been used!');
        else return message.channel.send(`✅ **${song.title}** \n\nESSE MUSICÃO DA PREULA FOI ADICIONADO NA FILA!`);
    }
    return undefined;
}

async function getVideo() {

    var condition = true;
    var video;

    while (condition) {
        var url = await songlist();
        video = await youtube.getVideo(url);  
        
        if(video) condition = false;
    }

    return video;
}

async function naqueue(song, message, voiceChannel) {
    
    // console.log(song);
    var video;
    var condition = true;

    if(!song) {

        console.log(`-----------------------------------`)
        while (condition) {
            var url = await songlist();
            try {
                video = await youtube.getVideo(url);
                console.log(video);
                condition = false;
            } catch (error) {
                console.log(error);
                url = await songlist();
                video = await youtube.getVideo(url);
            }
        }

        const song = {
            id: video.id,
            title: Util.escapeMarkdown(video.title),
            url: `https://www.youtube.com/watch?v=${video.id}`
        }

        handleVideo(video, message, voiceChannel, true);

    }
}

async function play(guild, song, message = null, voiceChannel = null) {
    const serverQueue = queue.get(guild.id);
    var url = '', newurl = '';

    // if (!song) {
    //     serverQueue.voiceChannel.leave(); //deixar canal
    //     // newurl = await songlist();
    //     queue.delete(guild.id); // limpar fila
    //     return;
    // }

    const dispatcher = serverQueue.connection.playStream(ytdl(song.url)) //first is prefix -< args[0]
        .on('end', reason => {
            if (reason === 'Stream is not generating quickly enough.') console.log('Song ended.');
            else console.log(reason, ' reason');
            serverQueue.songs.shift();

            if(!serverQueue.songs[0]){
                queue.delete(guild.id);
                naqueue(serverQueue.songs[0], message, voiceChannel);
            }
            else
                play(guild, serverQueue.songs[0], message, voiceChannel);
        })
        .on('error', error => console.error(error));

    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
    serverQueue.textChannel.send(`🎶 Start playing: **${song.title}**`);
}

async function songlist() {

    var max = await db.Playlist.count();
    var line = Math.random() * (max - 1) + 1;
    line = Math.round(line);
    var song = await db.Playlist.findById(line);

    return song.url;
}

async function newsong(link) {
    var retorno = false;

    var song = await db.Playlist.findOne({ where: {url: link}});

    if (song) 
        retorno = false;
    else {
        await db.Playlist.create({ url: link});
        retorno = true;
    }
    return retorno;
}

/* YT REGEX : https://stackoverflow.com/questions/3717115/regular-expression-for-youtube-links  ** by Adrei Zisu **/
function isYTLink(input) {
    var YT_REG = /http(?:s?):\/\/(?:www\.)?youtu(?:be\.com\/watch\?v=|\.be\/)([\w\-\_]*)(&(amp;)?‌​[\w\?‌​=]*)?/
    return YT_REG.test(input);
}

function setActivity(activity) {
    client.user.setActivity(activity);
}

client.login(TOKEN_HOMO);