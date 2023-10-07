const { PermissionFlagsBits } = require("discord.js")
const { format_details } = require('./formatter')
const { create_button } = require('./button_functions')
const { create_action_row } = require('./action_row_functions')
const { ButtonStyle, ChannelType } = require('discord.js')

async function create_channel(guild, name, type, parent) {
    const existingChannel = guild.channels.cache.find(channel => channel.name === name);

    if (existingChannel) {
        return existingChannel;
    }

    const channel = await guild.channels.create({
        name,
        type,
        parent,
        permissionOverwrites: [
            {
                id: guild.roles.everyone,
                deny: [PermissionFlagsBits.SendMessages],
            },
        ],
    });

    return channel;
}

async function send_daily_problems( channel, dayKey, problem_links ) {
    let buttons = [];
    const problemLinks = problem_links[format_details(dayKey)];

    for (const problemName in problemLinks) {
        const link = problemLinks[problemName];
  
        const button = create_button(problemName, ButtonStyle.Link, `${dayKey.day_count}`, link);

        buttons.push(button);
    }

    const actionRow = create_action_row(buttons);

    channel.send({
        content: `${format_details(dayKey, " ")}\n@everyone`,
        components: [actionRow],
    })
}

async function rearrange_threads(guild, channel, currentParentId, archivedParentId, details_of_the_day ) {
    channel.setParent(archivedParentId);

    try {
        const new_channel = await create_channel(guild,  '『📜』' + format_details(details_of_the_day), ChannelType.GuildForum, currentParentId);
        console.log('New Channel Created');
        return new_channel;
    } catch (err) {
        console.error('New Channel Not Created:', err);
    }
    return null;
}

module.exports = { create_channel, send_daily_problems, rearrange_threads }
