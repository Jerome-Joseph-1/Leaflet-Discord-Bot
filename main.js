require('dotenv').config();
const fs = require('fs');
const logger = require('./src/logging/logger');
const { create_button, is_button_present } = require('./src/functions/button_functions');
const { create_action_row } = require('./src/functions/action_row_functions')
const { create_channel, send_daily_problems, rearrange_threads } = require('./src/functions/channel_functions')
const { format_details } = require('./src/functions/formatter')

const { Client, GatewayIntentBits, ChannelType, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType, PermissionFlagsBits, StringSelectMenuBuilder } = require('discord.js');
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
    ],
});

function readJSON(filename) {
    const data = fs.readFileSync(filename, { encoding: 'utf8' });
    return JSON.parse(data);
}

const details_of_the_day = readJSON('src/Json-Details/details.json');
const problem_links = readJSON('src/Json-Details/problems.json');
var myGuild, activeDoubtsChannel, queryButtonChannel, problemsChannel;

client.once('ready', async () => {
    logger.info(`Logged in as ${client.user.tag}`); 
    try {

        myGuild = client.guilds.cache.get(process.env.GUILD_ID);

        activeDoubtsChannel = await create_channel(myGuild, '『📜』' + format_details(details_of_the_day), ChannelType.GuildText, process.env.DISCUSSION);
        logger.info(`Created/Retrieved activeDoubtsChannel: ${activeDoubtsChannel.name}`); 

        queryButtonChannel = await create_channel(myGuild, "『💡』create-query", ChannelType.GuildText, process.env.DISCUSSION);
        logger.info(`Created/Retrieved queryButtonChannel: ${queryButtonChannel.name}`); 
        const isPresent = await is_button_present( queryButtonChannel );

        if( !isPresent ) {

            const queryButton = create_button("Create Query", ButtonStyle.Success, process.env.QUERY_BUTTON_ID);

            const actionRow = create_action_row(queryButton);

            await queryButtonChannel.send({
                content: 'Click to create query',
                components: [actionRow],
            })

            logger.info(`Created and sent queryButton`);
        }
        problemsChannel = await create_channel(myGuild, "『❓』problems", ChannelType.GuildText, process.env.DISCUSSION);
        logger.info(`Created/Retrieved problemsChannel: ${problemsChannel.name}`); 

    } catch (err) {
        logger.error('Error during initialization\nERROR::');
        logger.error(err);
    }   
});

client.on('interactionCreate', async (interaction)=>{
    try {
        if(interaction.isChatInputCommand() && interaction.member.roles.cache.has(process.env.SUPPORT_ROLE)) {
            if(interaction.commandName === 'send-problems') {
                send_daily_problems(problemsChannel, details_of_the_day, problem_links);
                interaction.reply({
                    content: 'Problems Sent',
                    ephemeral: true
                })
                logger.info('Sent daily problems.');
            } else if(interaction.commandName === 'set-next-day') {
                details_of_the_day.day_count += 1;
    
                try {
                    await fs.promises.writeFile('./src/Json-Details/details.json', JSON.stringify(details_of_the_day));
                    logger.info('Details updated and saved.');

                } catch (err) {
                    logger.error({ err }, 'Error writing details.json');
                }
    
                activeDoubtsChannel = await rearrange_threads(myGuild, activeDoubtsChannel, process.env.DISCUSSION, process.env.ARCHIVE, details_of_the_day);
                logger.info('Rearranged threads in activeDoubtsChannel.');

                // TODO : Uncomment the following line after adding problems to problems.json
                // send_daily_problems(problemsChannel, details_of_the_day, problem_links);
    
                interaction.reply({
                    content: 'Next Day is Set',
                    ephemeral: true
                })
            } else if(interaction.commandName === 'send-completed-button') {
                const mentionedUser = interaction.options.get('user');
    
                const completedButton = create_button("Completed", ButtonStyle.Success, `completedButton:${mentionedUser.value}`)
                const cancelButton = create_button("Cancel", ButtonStyle.Danger, `cancelButton:${mentionedUser.value}`)
    
                const actionRow = create_action_row([completedButton, cancelButton]);
    
                try {
                    await interaction.channel.send({ content : `Press the button to close the thread.`, components: [actionRow]})
                    logger.info(`Completed Button Created for user : [${mentionedUser.user.id}, ${mentionedUser.user.username}]`);
                } catch (error) {
                    logger.error({error}, 'Error Adding Query Button:');
                }
    
                interaction.reply({
                    content: "Button Should Be Generated.",
                    ephemeral: true,
                })
    
            }
        } else if(interaction.isButton && interaction.customId === process.env.QUERY_BUTTON_ID) {
            const modal = new ModalBuilder()
            .setTitle("Create Query")
            .setCustomId("queryModal")
            .setComponents(
                new ActionRowBuilder().setComponents(
                    new TextInputBuilder()
                    .setLabel("Problem Title")
                    .setCustomId("queryTitle")
                    .setStyle(TextInputStyle.Short)
                ),
                new ActionRowBuilder().setComponents(
                    new TextInputBuilder()
                    .setLabel("Link")
                    .setCustomId("queryLink")
                    .setStyle(TextInputStyle.Short)
                ),
                new ActionRowBuilder().setComponents(
                    new TextInputBuilder()
                    .setLabel("Short Description")
                    .setCustomId("description")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
                ),
                new ActionRowBuilder().setComponents(
                    new TextInputBuilder()
                    .setLabel("Code")
                    .setCustomId("queryCode")
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(false)
                ),
            )
    
            interaction.showModal(modal);
        } else if(interaction.type === InteractionType.ModalSubmit) {
            logger.info("Registering Thread", {
                "user_details":[interaction.user.id,
                interaction.user.tag,]
            });
            
            const thread = await activeDoubtsChannel.threads.create({
                name: interaction.fields.getField('queryTitle').value,
                type: ChannelType.PrivateThread,
                reason: 'Dont Clutter',
            });
            let details = {
                "user": [interaction.user.id, interaction.user.tag],
                "thread_created_at": thread.createdAt,
                "thread_create_timestamp": thread.createdTimestamp,
                "thread_id": thread.id
            }
            logger.info(details);
            
            thread.send(`# __${interaction.fields.getField('queryTitle').value}__
## ${interaction.fields.getField('description').value}
### Link: ${interaction.fields.getField('queryLink').value}
Code: ${"```"}${interaction.fields.getField('queryCode').value} ${"```"}
<@${interaction.user.id}> <@&${process.env.SUPPORT_ROLE}>`)
            
            logger.info(`Thread Registered`);
            
            const threadLink = `https://discord.com/channels/${activeDoubtsChannel.id}/${thread.id}`
            interaction.reply({
                content: `Your query now has a dedicated thread where you can continue the discussion. \nFeel free to engage in the conversation there. \nClick this link to take you there : ${threadLink}`,
                ephemeral: true
            })
        } else if(interaction.isButton && interaction.customId?.split(':')[0] === "completedButton") {
    
            if(interaction.customId.split(':')[1] === interaction.user.id || interaction.member.roles.cache.has(process.env.SUPPORT_ROLE) || interaction.member.roles.cache.has(process.env.MODERATOR_ROLE)) {
                logger.info("Owner Closed The Thread");
                logger.info({
                    "user_id" : interaction.user.id,
                    "user_tag": interaction.user.tag 
                })
                await interaction.message.edit({
                    content: 'Thread Closed.',
                    components: [],
                });
                logger.info('Action Completed by user.');
                
                const messages = await interaction.channel.messages.fetch({ limit: 1, after: 0 });
                const firstMessage = messages.first();
    
                await firstMessage.react('✅');
    
                await interaction.channel.edit({
                    archived: true,
                });
            } else {
                interaction.reply({
                content: 'Only the owner can mark this thread as completed .',
                ephemeral: true,
            })
            }
        } else if (interaction.isButton && interaction.customId?.split(':')[0] === "cancelButton") {
            // Handle the "Cancel" button press here
            if(!(interaction.user.id == interaction.customId.split(':')[1] || interaction.member.roles.cache.has(process.env.SUPPORT_ROLE))) {
                interaction.reply({
                    content: 'You are not the Owner of the thread',
                    ephemeral: true,
                })
                return;
            }
            try {
              // Edit the message to remove the buttons
              await interaction.message.edit({
                content: 'Action has been canceled. Buttons have been removed.',
                components: [],
              });
              logger.info('Action canceled by user.');
            } catch (error) {
                logger.error('Error removing buttons:');
                logger.error(error)
            }
        
        } else {
            try {
                interaction.reply({
                    content: 'You do not have permission for this',
                    ephemeral: true,
                })
            }
            catch(err) {
                logger.fatal('Failed to send Interaction')
                logger.fatal(err)
            }
        }
    } catch (err) {
        logger.fatal(err);
        interaction.reply({
            content: "Something Failed, Contact the moderators for resolving this issue.",
            ephemeral: true
        })
    }
})

client.login(process.env.CLIENT_TOKEN)