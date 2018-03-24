const { Client,Util } = require('discord.js');
const { TOKEN,PREFIX,GOOGLE_API_KEY, VOLUME } = require('./config');
const YouTube = require('simple-youtube-api');
const ytdl = require('ytdl-core');
const client = new Client({ disableEveryone: true });
const youtube = new YouTube(GOOGLE_API_KEY);
const queue = new Map();

let lineReader = require('line-reader');


require('dotenv').load();

var db = require('./models');


client.on('warn', console.warn);
client.on('error', console.error);

db.sequelize.sync().then(function() {
    client.on('ready', () => {
        console.log('Só vai, to a mil aqui já!');
        client.user.setActivity('Pronto para tocar');
    });
});

client.on('disconnect', () => console.log('Disconectei pai...'));
client.on('reconnecting', () => console.log('To reconectando.. perai!'));



client.on('message', async message => {
    if (message.author.bot) return console.log('Bot ->', message.author.bot);
    if (!message.content.startsWith(PREFIX)) return console.log('Porra ELMERI! Commando errado ->', undefined);

    const args = message.content.split(' ');
    const searchString = args.slice(1).join(' ');
    const url = args[1] ? args[1].replace(/<(.+)>/g, '$1') : '';
    const serverQueue = queue.get(message.guild.id);
    const voiceChannel = message.member.voiceChannel;


    let command = message.content.toLowerCase().split(' ')[0];
    command = command.slice(PREFIX.length);

    if (command === 'tocar') {

        if (!voiceChannel) return message.channel.send('Não encontrei o canal de voz');

        const permissions = voiceChannel.permissionsFor(message.client.user);

        if (!permissions.has('CONNECT')) {
            return message.channel.send('NAO POSSO CONECTAR. Rerveja suas permissões');
        }

        if (!permissions.has('SPEAK')) {
            return message.channel.send('NAO POSSO FALAR AQUI? Rerveja suas permissões');
        }

        // if (url.match(/^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/)) {
        //     const playlist = await youtube.getPlaylist(url);
        //     const videos = await playlist.getVideos();
        //     for (const video of Object.values(videos)) {
        //         const video2 = await youtube.getVideoByID(video.id); // eslint-disable-line no-await-in-loop
        //         await handleVideo(video2, message, voiceChannel, true); // eslint-disable-line no-await-in-loop
        //     }
        //     return message.channel.send(`✅ Playlist: **${playlist.title}** has been added to the queue!`);
        // } else {
        try {
            var video = await youtube.getVideo(url);
        } catch (error) {
            try {
                var videos = await youtube.searchVideos(searchString, 10);
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
                console.error(err);
                return message.channel.send('🆘 Ih rapaz... Não achei nada aqui em. SORRY!');
            }
        }
        return handleVideo(video, message, voiceChannel);
        // } fim else

    } else if (command === 'pular') {
        if (!message.member.voiceChannel) return message.channel.send('Voce não está no canal!');
        if (!serverQueue) return message.channel.send('Não há mais música, trollo em');

        serverQueue.connection.dispatcher.end();

        return message.channel.send('VC Q MANDA, ENTÃO TOMA A PRÓXIMA!');
    } else if (command === 'parar') {
        if (!message.member.voiceChannel) return message.channel.send('Voce não está no canal!');
        if (!serverQueue) return message.channel.send('Tem nada pra parar não loko, trollo em');

        serverQueue.songs = [];
        serverQueue.connection.dispatcher.end();

        return message.channel.send('A MUSICA FOI PARADA, TA DE TIRACAO PAI ?!');

    } else if (command === 'volume') {

        if(!args[1] >= 30) return message.channel.send(`QUER FICAR SURDO?? (Volume máximo 30).\n\n Volume atual: **${serverQueue.volume}**`);
		if (!message.member.voiceChannel) return message.channel.send('VOCE NÃO TA NO CANAL');
		if (!serverQueue) return message.channel.send('NÃO TEM NADA TOCANDO BB..');
        if (!args[1]) return message.channel.send(`Volume atual: **${serverQueue.volume}**`);
        
		serverQueue.volume = args[1];
		serverQueue.connection.dispatcher.setVolumeLogarithmic(args[1] / 5);
        
        return message.channel.send(`Novo volume: **${args[1]}**`);
	}
     else if (command === 'tocando') {
        if (!serverQueue) return message.channel.send('Como vai mostrar, se não tem nada pra tocar em???.');
        return message.channel.send(`🎶 Tocando agora: **${serverQueue.songs[0].title}**`);
    } else if (command === 'fila') {
        if (!serverQueue) return message.channel.send('TEM PORRA NENHUMA AQUI NÃO!');
        return message.channel.send(`__**Músicas da fila:**__ \n\n${serverQueue.songs.map(song => `**-** ${song.title}`).join('\n')} \n\n** Tocando agora:** ${serverQueue.songs[0].title}
		`);
    } else if (command === 'pausar') {
        if (serverQueue && serverQueue.playing) {
            serverQueue.playing = false;
            serverQueue.connection.dispatcher.pause();
            return message.channel.send('⏸ TA PAUSADO!');
        }
        return message.channel.send('NÃO TEM NADA TOCANDO BB.');
    } else if (command === 'voltar') {
        if (serverQueue && !serverQueue.playing) {
            serverQueue.playing = true;
            serverQueue.connection.dispatcher.resume();
            return message.channel.send('▶ AE PORRA, VOLTOU A FESTA!');
        }
        return message.channel.send('NÃO TEM NADA TOCANDO BB.');
    }

    return undefined;
});



async function handleVideo(video, message, voiceChannel, playlist = false) {
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
            play(message.guild, queueConstruct.songs[0]);
        } catch (error) {
            console.error(`NÃO PUDE ENTRAR NO CANAL: ${error}`);
            queue.delete(message.guild.id);
            return message.channel.send(`NÃO PUDE ENTRAR NO CANAL: ${error}`);
        }
    } else {
        serverQueue.songs.push(song);
        console.log(serverQueue.songs);
        if (playlist) return undefined;
        else return message.channel.send(`✅ **${song.title}** ✅\n\nESSE MUSICÃO DA PREULA FOI ADICIONADO NA FILA NENÉM!`);
    }
    return undefined;
}

function play(guild, song) {
    const serverQueue = queue.get(guild.id);

    if (!song) {
        serverQueue.voiceChannel.leave();
        queue.delete(guild.id); // limpar fila
        return console.log('No more songs');
    }

    console.log(serverQueue.songs);

    const dispatcher = serverQueue.connection.playStream(ytdl(song.url)) //first is prefix -< args[0]
        .on('end', () => {
            console.log('Song ended.');
            serverQueue.songs.shift();
            play(guild, serverQueue.songs[0]);
        })
        .on('error', error => console.error(error));

    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);

    setActivity(`Reproduzinho: ${song.title} 🎶🎶`);
    
    serverQueue.textChannel.send(`🎶 Start playing: **${song.title}**`);
}


function setActivity(activity) {
    client.user.setActivity(activity);
}

client.login(TOKEN);