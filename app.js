const {Client,Util} = require('discord.js');
const {TOKEN, TOKEN_HOMO, PREFIX,PREFIX_OPEN_EXIT,GOOGLE_API_KEY,IGOR, LIST_MUSIC} = require('./config/config-bot');
var {VOLUME} = require('./config/config-bot');
const YouTube = require('simple-youtube-api');
const ytdl = require('ytdl-core');
const client = new Client({disableEveryone: true});
const youtube = new YouTube(GOOGLE_API_KEY);
const queue = new Map();

//let lineReader = require('line-reader');
require('dotenv').load();
var db = require('./models');  // database and tables

client.on('warn', console.warn);
client.on('error', console.error);

db.sequelize.sync().then(function () {
    client.on('ready', async () => {
        console.log('Bot Keirrison -> Launched...');
    });
});

client.on('disconnect', () => console.log('Disconectei pai...'));
client.on('reconnecting', () => console.log('To reconectando.. perai!'));

client.on('message', async message => {
    if (message.author.bot) return console.log('Bot ->', message.author.bot);
    if (!message.content.startsWith(PREFIX)) return console.log('Porra ELMERI! Commando errado ->', undefined);
    
    
    //console.log(message.member.user.id, ' ', message.member.user.username);
    
    const args = message.content.split(' ');
    const searchString = args.slice(1).join(' ');
    const url = args[1] ? args[1].replace(/<(.+)>/g, '$1') : '';
    const serverQueue = queue.get(message.guild.id);
    const voiceChannel = message.member.voiceChannel;


    let command = message.content.toLowerCase().split(' ')[0];
    let enter_exit = command.slice(PREFIX_OPEN_EXIT.length);
    
    if(enter_exit == 'entrar') {
	db.Command.create({name: enter_exit,userid:message.member.user.id,username:message.member.user.username});
        
	let role = await message.guild.roles.get('384350517280636928');
        console.log(role);
        if(message.member.roles.has(role.id)) {
            return message.channel.send('VOCE JÁ ENTROU PAI... burro');
        } else {
            message.member.addRole(role.id)
            return message.channel.send('BEM VINDO AO BONDE CUZAO!');
        }
    }
    else if(enter_exit == 'sair') {
         db.Command.create({name: enter_exit,userid:message.member.user.id,username:message.member.user.username});
	
	let role = await message.guild.roles.get('384350517280636928');

        if(message.member.roles.has(role.id)) {
            message.member.removeRole(role.id);
            return message.channel.send('ADEUS LIXO!');
        }
        else {
            return message.channel.send('MAS TU NEM ENTROU.. ué');
        }
    }
    
    command = command.slice(PREFIX.length); // others command


    if(command == 'desconectar'){
	 saveCommand(command, message); 
	message.guild.voiceConnection.disconnect();
    }
  
    else if (command == 'tocar') {

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
                var videos = await youtube.searchVideos(searchString, LIST_MUSIC);
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
	
	saveCommand(command + ' ' + Util.escapeMarkdown(video.title), message);
        return handleVideo(video, message, voiceChannel, false);

    } else if (command == 'pular') {
        if (!message.member.voiceChannel) return message.channel.send('Voce não está no canal!');
        if (!serverQueue) return message.channel.send('Nem iniciei, vou pular o que?.');
        
        saveCommand(command, message);
        serverQueue.connection.dispatcher.end('Skip command has been used!');
        
        return undefined;

    } else if (command == 'parar') {
        if (!message.member.voiceChannel) return message.channel.send('Voce não está no canal!');
        
	saveCommand(command, message);

        if (!serverQueue) 
        {
            voiceChannel.leave();
        }
        else {
            serverQueue.voiceChannel.leave();
        }

        return undefined;

    } else if (command == 'volume') {

        if (!args[1] >= 100) return message.channel.send(`QUER FICAR SURDO?? (Volume máximo 100).\n\n Volume atual: **${serverQueue.volume}**`);
        if (!message.member.voiceChannel) return message.channel.send('VOCE NÃO TA NO CANAL');
        
	
	
	if (!args[1]){
	    saveCommand(command, message);
            return message.channel.send(`Volume atual: **${(serverQueue.volume)}**`);
	}
	
        if (serverQueue) {
            serverQueue.volume = args[1];
            serverQueue.connection.dispatcher.setVolumeLogarithmic((serverQueue.volume / 10) / 5);
        } else
            serverQueue.connection.dispatcher.setVolumeLogarithmic((args[1]/10) / 5);

            VOLUME = args[1];
	    saveCommand(command + ' ' + VOLUME, message);
            return message.channel.send(`Novo volume: **${VOLUME}**`);

    } else if (command == 'tocando') {
        if (!serverQueue) return message.channel.send('Como vai mostrar, se não tem nada pra tocar em???.');
	
	saveCommand(command, message);

        return message.channel.send(`🎶 Tocando agora: **${serverQueue.songs[0].title}**`);
    } else if (command == 'fila') {
        if (!serverQueue) return message.channel.send('TEM PORRA NENHUMA AQUI NÃO!');

	saveCommand(command, message);
        return message.channel.send(`__**Músicas da fila:**__ \n\n${serverQueue.songs.map(song => `**-** ${song.title}`).join('\n')} \n\n **Tocando agora: ** ${serverQueue.songs[0].title}`);
	
        // ${serverQueue.songs[0].title} tocando agora

    } else if (command == 'pausar') {
        // if (serverQueue && serverQueue.playing) {
        //     serverQueue.playing = false;
        //     serverQueue.connection.dispatcher.pause();
        //     return message.channel.send('⏸ TA PAUSADO!');
        // }

        // return message.channel.send('NÃO TEM NADA TOCANDO BB.');

	saveCommand(command, message);
        serverQueue.connection.dispatcher.pause();
        return message.channel.send('⏸ TA PAUSADO!');

    } else if (command == 'voltar') {
        // if (serverQueue && !serverQueue.playing) {
        //     serverQueue.playing = true;
        //     serverQueue.connection.dispatcher.resume();
        //     return message.channel.send('▶ AE PORRA, VOLTOU A FESTA!');
        // }
        // return message.channel.send('NÃO TEM NADA TOCANDO BB.');
	saveCommand(command, message);
        serverQueue.connection.dispatcher.resume();
        return message.channel.send('▶ AE PORRA, VOLTOU A FESTA!');
    } else if (command == 'nova') {

        var isLink = isYTLink(url);

        if (isLink) {
            if (await newsong(url) == true) {
		saveCommand(command + ' ' + url, message);
                return message.channel.send(`✅ Música adicionada a sua playlist`);
            } else {
                return message.channel.send(`Esta url já foi adicionada`)
            }
        } else {
            return message.channel.send('🆘 Ih rapaz... LINK INVALIDO! 🆘🆘🆘🆘🆘');
        }
    } else if (command == 'summon') {  
        if (!message.member.voiceChannel) return message.channel.send('Voce não está no canal!');
        
	saveCommand(command, message);
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
    } else if (command == 'ajuda' || command == 'ajudar') {
	saveCommand(command, message);
        return message.channel.send("``` Temos os seguintes comandos \n\n" + 
                                    "!!entrar - Use este comando para ter acesso a nossos canais\n" +
                                    "!!sair\n" +
                                    "!tocar + nome da música ou link do youtube\n" +
                                    "!pular - Use este comando para pular a música\n" + 
                                    "!volume - Use este comando para ver com o volume atual da música, que vai de 1 a 100\n"
                                    + "!volume (valor do volume) - Exemplo: !volume 30\n"+
                                    "!tocando - Use este comando para qual é música que está tocando\n" +
                                    "!fila - Use este comando para ver as músicas que estão na fila\n" +
                                    "!pausar - Use este comando para pausar uma música\n" +
                                    "!voltar - Use este comando para retomar a música pausada\n" +
                                    "!nova + link youtbe - Use este comando para cadastrar um nova música nova em nossa playlist. Ex: !nova https://www.youtube.com/watch?v=MVN-0xlzXro&t=124s\n"+
                                    "!summon - Use este comando para o bot começar a tocar no canal. ```");
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
        while (condition) {
            var url = await songlist();
            try {
                video = await youtube.getVideo(url);
                condition = false;
            } catch (error) {
                condition = true;
            }
        }

        const song = {id: video.id,title: Util.escapeMarkdown(video.title), url: `https://www.youtube.com/watch?v=${video.id}`}
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


    // var streamoptions = {quality: 'lowest', filter: 'audio'};
    const stream = await ytdl(song.url, { quality: 'lowest', filter: 'audioonly' });

    const dispatcher = serverQueue.connection.playStream(stream) //first is prefix -< args[0]
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

    dispatcher.setVolumeLogarithmic((serverQueue.volume / 10) / 5);

    var options = {url: song.url, type: 2};
    client.user.setActivity(`${song.title}`, options);    
    // serverQueue.textChannel.send(`🎶 Começando a tocar: **${song.title}**`);
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

function saveCommand(command, message) {
    db.Command.create({name: command,userid:message.member.user.id,username:message.member.user.username});
}

client.login(TOKEN_HOMO);