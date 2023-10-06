const { ButtonBuilder } = require("@discordjs/builders");

function create_button(label, style, customId, url = null) {
    let button = new ButtonBuilder()
        .setLabel(label)
        .setStyle(style);
    if( url !== null ) {
        button = button.setURL(url);
    } else {
        button = button.setCustomId(customId)
    }
    return button;
}

async function is_button_present(channel) {
    try {
        const message = await channel.messages.fetch(); // Fetch the single message in the channel

        return message.size > 0; 
    } catch(err) {
        console.log({err});
    }
    return false;
}

module.exports = { create_button, is_button_present };
