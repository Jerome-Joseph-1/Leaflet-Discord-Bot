const { ActionRowBuilder } = require("discord.js")

function create_action_row(components) {
    return new ActionRowBuilder().addComponents(components);
}

module.exports = { create_action_row }