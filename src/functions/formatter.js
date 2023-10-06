function format_details( obj, separator = '-' ) {
    return obj.prefix + separator + obj.day_count;
} 


module.exports = { format_details }