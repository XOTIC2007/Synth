const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  AttachmentBuilder,
  ChannelType,
} = require("discord.js");
const GuildSchema = require("../Models/Guild");
const { muzicard } = require("muzicard");

module.exports = async function AvonDispatcher(client, kazagumo) {
  kazagumo.on("playerStart", async (player, track) => {
    // Skip short tracks (less than 5 seconds)
    if (track.length < 5000) {
      player.skip();
      let channel = client.channels.cache.get(player.textId);
      if (channel) {
        channel.send({
          content: `- Track is less than **5 seconds**. Skipping the track.`,
        }).then((msg) => setTimeout(() => msg.delete(), 5000));
      }
      return;
    }
let guildData = await GuildSchema.findOne({ id: player.guildId });
const channel = client.channels.cache.get(player.textId);

let title = track.title;
let author = track.author;
let thumbnail = track.thumbnail;
let url = track.uri;
let artistLink = track.uri;
    player.queue.current.title = title;
    player.data.set("url", url);
    player.data.set("autoplayTrack", track);

    // Format requester info
    let ops = `[**${track.requester.globalName || track.requester.username}**](https://discord.com/users/${track.requester.id})`;

    client.utils.setVCStatus(player.voiceId, `<a:tezz444:1301577123131031624> ${title} by ${author}`);

    const nowPlaying = new EmbedBuilder()
      .setAuthor({
        name: `Player Information`,
        iconURL: "https://cdn.discordapp.com/emojis/1301577123131031624.gif?size=128&quality=lossless" ?? track.requester.displayAvatarURL({ dynamic: true }),
        url: track.uri,
      })
      .setImage("attachment://muzicard.png")
      .setColor(client.config.color)
      .setThumbnail(thumbnail)
      .addFields(
        {
          name: "<a:music_01:1377186204004388955>  Requested by:",
          value: ops,
          inline: true,
        },
        {
          name: "<a:maut_ka_time:1377185637136072726> Duration",
          value: track.isStream ? "Live" : await client.utils.convertTime(track.length),
          inline: true,
        }
      )
      .setFooter({
        text: `Autoplay - ${guildData.settings.autoplay ? "Enabled" : "Disabled"} ⁠・ Volume - ${player.volume}% ⁠・ Queue - ${player.queue.length}`,
        iconURL: track.requester.displayAvatarURL({ dynamic: true }),
      });

    // Create muzicard (visual representation of the track)
    const isRadioMode = false;  // Replace with actual logic to determine radio mode
    const isAIDJMode = false;  // Replace with actual logic to determine AI DJ mode
    const card = new muzicard()
      .setName(isRadioMode ? "Radio Station" : isAIDJMode ? "AI DJ" : track.title)
      .setAuthor(isRadioMode ? "Radio" : isAIDJMode ? "AI DJ" : "Synth")
      .setColor(isRadioMode ? "#FF5733" : isAIDJMode ? "#00BFFF" : "auto")
      .setTheme(isRadioMode ? "dynamic" : isAIDJMode ? "dynamic" : "dynamic")
      .setBrightness(isRadioMode ? 85 : isAIDJMode ? 70 : 69)
      .setThumbnail(track.thumbnail)
      .setProgress(isRadioMode ? 0 : 15)
      .setStartTime(isRadioMode ? "Radio Live" : isAIDJMode ? "AI DJ Live" : "0:10")
      .setEndTime(isRadioMode ? "Live" : isAIDJMode ? "Live" : track.length);

    const buffer = await card.build();
    if (!buffer) {
      console.error("Buffer is null or undefined");
      return;
    }

    const attachment = new AttachmentBuilder(buffer, {
      name: "muzicard.png",
    });

    // Buttons for the player controls
    const buttonsRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("previous").setStyle(client.btn.grey).setEmoji("<:11prev:1288550025173143654>"),
      new ButtonBuilder().setCustomId("PauseAndResume").setStyle(client.btn.grey).setEmoji("<:11pause:1288549936107094056>"),
      new ButtonBuilder().setCustomId("stop").setStyle(client.btn.red).setEmoji("<:11pause:1288549936107094056>"),
      new ButtonBuilder().setCustomId("settings").setStyle(client.btn.grey).setEmoji("1131847099361792082"),
      new ButtonBuilder().setCustomId("skip").setStyle(client.btn.grey).setEmoji("<:11next:1288549983049486411>")
    );

    const buttonsRow2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("like").setEmoji("1301594300639084635").setLabel("Like Track").setStyle(client.btn.green),
      new ButtonBuilder().setCustomId("music_invite").setEmoji("1301356058769621042").setLabel("Invite Friend").setStyle(client.btn.blue),
      new ButtonBuilder().setCustomId("lyrics").setEmoji("1205176894665003008").setLabel("Lyrics").setStyle(client.btn.blue)
    );

    // Handle description for high volume
    if (player.volume > 100) {
      nowPlaying.setDescription(
        `**[${title.length > 30 ? `${title.slice(0, 30)}...` : title}](${url})** by [**${author}**](${artistLink})\n- **Note:** *Volume is slightly higher than usual, may cause distortion*`
      );
    } else {
      nowPlaying.setDescription(
        `**[${title.length > 30 ? `${title.slice(0, 30)}...` : title}](${url})** by [**${author}**](${artistLink})`
      );
    }

    // Send message with buttons and muzicard attachment if the channel exists
    if (channel) {
      try {
        const msg = await channel.send({
          embeds: [nowPlaying],
          files: [attachment],
          components: [buttonsRow, buttonsRow2],
        });
        player.data.set("message", msg);
      } catch (err) {
        console.error("Failed to send message in the channel:", err);
      }
    } else {
      player.destroy();
      let channelGuild = client.guilds.cache.get(player.guildId);
      let channels = channelGuild.channels.cache.filter((c) => c.type === ChannelType.GuildText);
      await client.channels.cache
        .get(channels.first().id)
        .send({ content: `I can't find the text channel to send the message. So destroying the player.` })
        .then((msg) => setTimeout(() => msg.delete(), 8000))
        .catch((err) => console.error(err));
    }
  });


  // Event handler for when the player is moved
  kazagumo.on("playerMoved", async (player, state, channels) => {
    client.utils.removeVCStatus(player.voiceId);
    try {
      const newChannel = client.channels.cache.get(channels.newChannelId);
      const oldChannel = client.channels.cache.get(channels.oldChannelId);
      let channel = client.channels.cache.get(player.textId);
      if (channels.newChannelId === channels.oldChannelId) return;
      if (!channel) return;
      if (state === "UNKNOWN") {
        player.destroy();
        return channel
          .send({
            content: `- Unable to move to the new channel. So Destroying the player.`,
          })
          .then((msg) => setTimeout(() => msg.delete(), 8000));
      }
      if (state === "MOVED") {
        player.setVoiceChannel(channels.newChannelId);
        if (player.paused) player.pause(false);
        return channel
          .send({
            content: `- Someone moved me from **${oldChannel.name}** to **${newChannel.name}**`,
          })
          .then((msg) => setTimeout(() => msg.delete(), 8000));
      }
      if (state === "LEFT") {
        let data = await GuildSchema.findOne({ id: player.guildId });
        if (channels.newChannel) {
          player.setVoiceChannel(channels.newChannelId);
        } else {
          if (player) player.destroy();
          let shard = await client.guilds.cache.get(data.id).shardId;
          if (data.twentyFourSeven.enabled) {
            setTimeout(async () => {
              await client.kazagumo.createPlayer({
                guildId: data.id,
                textId: data.twentyFourSeven.textChannel,
                voiceId: data.twentyFourSeven.voiceChannel,
                shardId: shard,
                deaf: true,
                selfmute: false,
              });
            }, 3000);
          } else {
            if (player) player.destroy();
            const oldChannel = client.channels.cache.get(channels.oldChannelId);
            return channel
              .send({
                content: ` - I have been left from **${oldChannel.name}**. Destroying the player.`,
              })
              .then((msg) => setTimeout(() => msg.delete(), 8000));
          }
        }
      }
    } catch (e) {
      const player = client.kazagumo.players.get(player.guildId);
      player.destroy();
    }
  });

  // Event handler for when the track is stuck
  kazagumo.on("playerStuck", async (player, data) => {
    client.utils.removeVCStatus(player.voiceId);
    const channel = client.channels.cache.get(player.textId);
    let msg = player.data.get("message").id;
    if (channel) {
      if (channel.messages.cache.get(msg)) {
        channel.messages.cache.get(msg).delete();
      }
    }
    console.warn(
      `Track is stuck for more than ${data.threshold}ms. Skipping the track in ${player.guildId}`
    );
    if (channel) {
      channel
        .send({
          content: `- Track is stuck for more than ${data.threshold}ms. Skipping the track.`,
        })
        .then((msg) => setTimeout(() => msg.delete(), 5000));
      player.skip();
    }
  });
};

/** 

@code Design By Itachi 
@for support join https://discord.gg/dark-moon

**/