const {
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  WebhookClient,
  EmbedBuilder,
} = require("discord.js");
const guildSchema = require("../../Models/Guild");
const userSchema = require("../../Models/User");

module.exports = async (client, message) => {
  try {
    if (message.author.bot || message.channel.type === 1) return;

    const guildData = await guildSchema.findOneAndUpdate(
      { id: message.guild.id },
      { $setOnInsert: { id: message.guild.id, prefix: "+" } },
      { upsert: true, new: true, setDefaultsOnInsert: true, lean: true }
    );
    let prefix = guildData.prefix ?? `+`;

    const mentionRegex = new RegExp(`^<@!?${client.user.id}>$`);
    if (message.content.match(mentionRegex)) {
      const msg =
        Math.random() > 0.5
          ? `> <a:mash_cute:1377184483102560298> Greetings <@!${message.author.id}>! I am ${client.user.username}, a user-friendly bot with unique features.\n- Join [Support Server](https://discord.gg/dark-moonmoon)\n- Invite Me [${client.user.username}](https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands)\n- My Prefix is \`${prefix}\``
          : `> <a:mash_cute:1377184483102560298> Hlo **${message.author.globalName}**! This is ${client.user.username}, a legendary music bot.\n- Join [Support Server](https://discord.gg/dark-moon)\n- Invite Me [${client.user.username}](https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands)\n- My Prefix is \`${prefix}\``;

      const embed = new EmbedBuilder()
        .setAuthor({
          name: `Synth Music For You`,
          iconURL: client.user.displayAvatarURL({ dynamic: true }),
        })
        .setColor(client.config.color)
        .setDescription(`${msg}\n-# Special Thanks To All Supporters ❤`)
        .setImage(
          "https://cdn.discordapp.com/attachments/1308870168738529460/1325763604049297440/pookie-music_1736157046.png?ex=677e4a92&is=677cf912&hm=110f86a6d0af09affba92531da277448d2958943eb1469814e88fb967c215a27&"
        );

      const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel("Support Server")
          .setStyle(ButtonStyle.Link)
          .setURL("https://discord.gg/dark-moon"),
        new ButtonBuilder()
          .setLabel("Invite Me")
          .setStyle(ButtonStyle.Link)
          .setURL(
            `https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`
          )
      );
      return message.channel
        .send({ embeds: [embed], components: [actionRow] })
        .catch(() => {
          message.author
            .send({
              content: `I cannot send messages in ${message.channel.name}. Please ensure I have permissions to send messages in that channel.`,
            })
            .catch(() => {});
        });
    }

    let dev = client.config.developers;
    // Load noPrefix users from file
    let fileNoPrefixUsers = [];
    try {
      fileNoPrefixUsers = require("../../Commands/Developers/noPrefixUsers.json");
    } catch {
      fileNoPrefixUsers = [];
    }
    // Combine DB and file-based noPrefix users
    let noprefixUsers = [];
    let userData = await userSchema.find({ noPrefix: true });
    userData.forEach((user) => {
      noprefixUsers.push(user.id);
    });
    noprefixUsers = [...new Set([...noprefixUsers, ...fileNoPrefixUsers])];

    if (
      (dev.includes(message.author.id) ||
        noprefixUsers.includes(message.author.id)) &&
      !message.content.startsWith(prefix)
    ) {
      prefix = "";
    }

    const reg = (newprefix) => {
      return newprefix.replace(/[.*+?^${}()|[\]\\]/g, `\\$&`);
    };

    // 🔥 Updated no-prefix handling block
    let args, commandName;
    const mentionprefix = new RegExp(`^(<@!?${client.user.id}>|${reg(prefix)})`);
    if (mentionprefix.test(message.content)) {
      const [, content] = message.content.match(mentionprefix);
      args = message.content.slice(content.length).trim().split(/ +/);
      commandName = args.shift().toLowerCase();
    } else if (
      dev.includes(message.author.id) ||
      noprefixUsers.includes(message.author.id)
    ) {
      args = message.content.trim().split(/ +/);
      commandName = args.shift().toLowerCase();
    } else {
      return; // Not a command
    }

    const cmd =
      client.commands.get(commandName) ||
      client.commands.find(
        (c) => c.aliases && c.aliases.includes(commandName)
      );
    if (!cmd) return;

    const checkBotPermissions = async (message, client) => {
      const rPermissions = [
        "SendMessages",
        "ViewChannel",
        "EmbedLinks",
        "UseExternalEmojis",
        "Connect",
        "Speak",
      ];
      try {
        const botMember = await message.guild.members.fetch(client.user.id);
        const mPermissions = rPermissions.filter(
          (perm) => !botMember.permissions.has(perm)
        );
        if (mPermissions.length > 0) {
          const permissionList = mPermissions.join(", ");
          const inviteLink = `https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`;
          const content = `- I need these many permissions ${permissionList}. Consider Reporting To Developer [MUGHAL (MUGHAL)](<https://discord.com/users/1300534329402982472>)`;
          try {
            await message.channel.send({ content });
            return;
          } catch (error) {
            if (error) {
              try {
                await message.author.send({
                  content: `I cannot send messages in **${message.channel.name}**. Please ensure I have permissions to send messages in that channel! [Re Invite Me](${inviteLink})`,
                });
              } catch (dmError) {
                console.error("Failed to send DM:", dmError);
              }
            } else {
              console.error("Error sending message:", error);
            }
          }
          return false;
        }
        return true;
      } catch (error) {
        console.error("Error checking bot permissions:", error);
        return false;
      }
    };

    if (cmd && !checkBotPermissions(message, client)) {
      return;
    }

    if (
      cmd.permission &&
      !message.member.permissions.has(cmd.permission) &&
      !dev.includes(message.author.id)
    ) {
      return message.channel
        .send({ content: `You lack the ${cmd.permission} permission.` })
        .catch(() => {
          message.author
            .send({
              content: `- <:Supporterss:1248199396491923486> I cannot send messages in ${message.channel.name}. Please ensure I have permissions to send messages in that channel! [Re Invite Me](https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands)`,
            })
            .catch(() => {});
        });
    }

    if (cmd.dev && !client.config.developers.includes(message.author.id)) {
      return message.channel.send({
        content: `- This command is restricted to Xotic`,
      });
    }

    if (
      cmd.options.owner &&
      !client.config.developers.includes(message.author.id)
    ) {
      return message.channel.send({
        content: `- This command is restricted to Xotic,Itachi,Gojo`,
      });
    }

    if (cmd.options.inVc && !message.member.voice.channel) {
      return message.channel.send({
        content: `- You must be in a voice channel to use this command.`,
      });
    }

    const player = client.kazagumo.players.get(message.guild.id) || null;
    if (cmd.options.player.active && !player) {
      return message.channel.send({
        content: `- I cannot Find the **Player** in this server, Try ${prefix}dc to disconnect the session.`,
      });
    }
    if (cmd.options.sameVc && !player) {
      return message.channel.send({
        content: `- I cannot Find the **Player** in this server, Try ${prefix}dc to disconnect the session.`,
      });
    }
    if (cmd.options.player.playing && (!player || !player.queue.current)) {
      return message.channel.send({
        content: `- There is no song currently playing.`,
      });
    }

    if (
      cmd.options.premium &&
      !guildData.premium &&
      !dev.includes(message.author.id)
    ) {
      return message.channel.send({
        content: `- This command is for premium servers only.`,
      });
    }

    if (cmd.options.vote) {
      let voted = await client.topgg.hasVoted(message.author.id);
      if (!voted && !dev.includes(message.author.id)) {
        return await message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(client.config.color)
              .setAuthor({
                name: `Vote Required`,
                iconURL: message.author.displayAvatarURL({ dynamic: true }),
              })
              .setDescription(
                `<:GZ_Announce_Side_Cyan:1287335673610637312> <@!${message.author.id}> You need to vote Synth In Top.gg to use this command. [Vote Here](${client.config.vote})`
              ),
          ],
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setLabel("Vote")
                .setStyle(5)
                .setEmoji("1012977248250376222")
                .setURL(client.config.vote)
            ),
          ],
        });
      }
    }

    await cmd
      .run({ client, message, args, prefix, guildData, player })
      .catch((error) => {
        console.error("Error executing command:", error);
        message.channel
          .send({
            content: `I encountered an error while executing the command. Please Report To Developer [XOTIC](<https://discord.com/users/745298312240038039>)`,
          })
          .catch(() => {
            message.author
              .send({
                content: `I cannot send messages in ${message.channel.name}. Please ensure I have permissions to send messages in that channel.`,
              })
              .catch(() => {});
          });
      });

    await logCommandExecution(client, message, cmd, args, cmd);
    await updateUserData(message.author.id, commandName);
  } catch (error) {
    console.error("Error in message event:", error);
  }
};

async function logCommandExecution(client, message, cmd, args, cmd) {
  // (Your existing logCommandExecution function unchanged!)
}

async function updateUserData(userId, commandName) {
  // (Your existing updateUserData function unchanged!)
}
