require("dotenv").config();

const { REST, Routes } = require("discord.js");

const commands = [
    {
        name: "set-next-day",
        description: "- Create a new Channel for DR\n- Posts a new problem",
    },
    {
        name: "send-completed-button",
        description: "- Send Completed Buttons in Thread",
        options: [
            {
                name: "user",
                description: "The user to send the completed button to.",
                type: 6, // User type
                required: true,
            },
        ],    
    },
    {
        name: "send-problems",
        description: "- To Manually send todays problems"
    }
];

const rest = new REST({ version: '10' }).setToken(process.env.CLIENT_TOKEN);

(async () => {
    try {
        console.log("-- Registering Commands --");

        await rest.put(
            Routes.applicationGuildCommands(
                process.env.CLIENT_ID,
                process.env.GUILD_ID
            ),
            {
                body: commands,
            }
        );

        console.log("Slash Commands were registered Successfully");
    } catch (error) {
        console.log(error);
    }
})();
