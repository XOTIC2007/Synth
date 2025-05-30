/** 

@code Design By itachi
@for support join https://discord.gg/dark-moon

**/

const {
  ActionRowBuilder,
  ButtonBuilder,
  EmbedBuilder,
  ButtonStyle,
  ComponentType,
} = require("discord.js");
const fs = require("fs");
const path = require("path");
const noPrefixPath = path.join(__dirname, "noPrefixUsers.json");

function loadNoPrefixUsers() {
  try {
    return JSON.parse(fs.readFileSync(noPrefixPath, "utf8"));
  } catch {
    return [];
  }
}

function saveNoPrefixUsers(users) {
  fs.writeFileSync(noPrefixPath, JSON.stringify(users, null, 2));
}

module.exports = {
  name: "noPrefix",
  aliases: ["nop"],
  category: "",
  description: "Add, remove, or list noPrefix users (file-based)",
  dev: false,
  options: {
    owner: false,
    inVc: false,
    sameVc: false,
    player: {
      playing: false,
      active: false,
    },
    premium: false,
    vote: false,
  },
  run: async ({ client, message, args }) => {
    try {
      // Debug: log command usage
      console.log("[NoPrefix] Command invoked by:", message.author.id, args);
      const tezz = [
        "745298312240038039",
        "1259377339842691219",
      ];
      if (!tezz.includes(message.author.id)) {
        return message.channel
          .send({ content: "You are not authorized to use this command." })
          .then((m) => setTimeout(() => m.delete(), 5000));
      }

      const sub = args[0]?.toLowerCase();
      if (!sub || !["add", "remove", "list", "view", "show"].includes(sub)) {
        return message.channel.send({
          content: "Usage: noPrefix <add|remove|list> [@user|userId]",
        });
      }

      const getUser = async () => {
        if (!args[1]) return null; // no argument given
        const mention = message.mentions.users.first();
        if (mention) return mention;
        const userId = args[1].replace(/[<@!>]/g, ""); // strip mention format
        if (!/^\d+$/.test(userId)) return null; // not a valid ID
        let user = client.users.cache.get(userId);
        if (user) return user;
        try {
          user = await client.users.fetch(userId);
        } catch (err) {
          console.error("[NoPrefix] Error fetching user:", err);
          user = null;
        }
        return user;
      };

      let noPrefixUsers = loadNoPrefixUsers();
      if (["add", "remove"].includes(sub)) {
        const user = await getUser();
        console.log("[NoPrefix] Target user:", user ? user.id : user);
        if (!user) {
          return message.channel.send({
            content: "Please mention a valid user or provide a valid user ID.",
          });
        }
        if (sub === "add") {
          if (noPrefixUsers.includes(user.id)) {
            const embed = new EmbedBuilder()
              .setAuthor({
                name: `No Prefix`,
                iconURL: user.displayAvatarURL({ dynamic: true }),
              })
              .setDescription(
                `**${
                  user.globalName ? user.globalName : user.username
                }** is already in the Global No Prefix List`
              )
              .setColor("Red")
              .setFooter({
                text: `Actioned by ${
                  message.author.globalName || message.author.username
                }`,
                iconURL: message.author.displayAvatarURL({ dynamic: true }),
              })
              .setTimestamp();
            return message.channel.send({ embeds: [embed] });
          }
          noPrefixUsers.push(user.id);
          saveNoPrefixUsers(noPrefixUsers);
          const embed = new EmbedBuilder()
            .setAuthor({
              name: `No Prefix`,
              iconURL: user.displayAvatarURL({ dynamic: true }),
            })
            .setDescription(
              `**${
                user.globalName ? user.globalName : user.username
              }** has been added to the Global No Prefix List`
            )
            .setColor(client.config.color || "Green")
            .setFooter({
              text: `Actioned by ${
                message.author.globalName || message.author.username
              }`,
              iconURL: message.author.displayAvatarURL({ dynamic: true }),
            })
            .setTimestamp();
          return message.channel.send({ embeds: [embed] });
        } else if (sub === "remove") {
          if (!noPrefixUsers.includes(user.id)) {
            const embed = new EmbedBuilder()
              .setAuthor({
                name: `No Prefix`,
                iconURL: user.displayAvatarURL({ dynamic: true }),
              })
              .setDescription(
                `**${
                  user.globalName ? user.globalName : user.username
                }** is not in the Global No Prefix List`
              )
              .setColor("Red")
              .setFooter({
                text: `Actioned by ${
                  message.author.globalName || message.author.username
                }`,
                iconURL: message.author.displayAvatarURL({ dynamic: true }),
              })
              .setTimestamp();
            return message.channel.send({ embeds: [embed] });
          }
          noPrefixUsers = noPrefixUsers.filter((id) => id !== user.id);
          saveNoPrefixUsers(noPrefixUsers);
          const embed = new EmbedBuilder()
            .setAuthor({
              name: `No Prefix`,
              iconURL: user.displayAvatarURL({ dynamic: true }),
            })
            .setDescription(
              `**${
                user.globalName ? user.globalName : user.username
              }** has been removed from the Global No Prefix List`
            )
            .setColor("Red")
            .setFooter({
              text: `Actioned by ${
                message.author.globalName || message.author.username
              }`,
              iconURL: message.author.displayAvatarURL({ dynamic: true }),
            })
            .setTimestamp();
          return message.channel.send({ embeds: [embed] });
        }
      }
      if (sub === "list" || sub === "view" || sub === "show") {
        if (!noPrefixUsers.length) {
          return message.reply({ content: "No users currently have No Prefix privileges.", ephemeral: true });
        }
        const pageSize = 10;
        const totalPages = Math.ceil(noPrefixUsers.length / pageSize);
        const hmm = async (page) => {
          const start = (page - 1) * pageSize;
          const end = page * pageSize;
          const usersInDb = noPrefixUsers.slice(start, end);
          const users = await Promise.all(
            usersInDb.map(async (id) => {
              const user = await client.users.fetch(id).catch(() => null);
              if (!user) return `Unknown User (${id})`;
              return `**${user.globalName || user.username}** (${user.id})`;
            })
          );
          return {
            description: users.map((u, i) => `**${start + i + 1}.** ${u}`).join("\n"),
            page,
            totalPages,
            total: noPrefixUsers.length
          };
        };
        let currentPage = 1;
        const em = await hmm(currentPage);
        const reply = await message.reply({ content: `No Prefix Users\n${em.description}\nPage ${em.page}/${em.totalPages} • Total Users: ${em.total}` });
        // Pagination buttons can be added if needed, but for file-based, keep it simple
      }
    } catch (err) {
      console.error("[NoPrefix] Unhandled error:", err);
      return message.channel.send({
        content: "An unexpected error occurred. Please report this to the developer.",
      });
    }
  },
};