const mongoose = require('mongoose');

const AyetHadisSchema = new mongoose.Schema({
    content:{
        type : String,
        required : true
    },
    source:{
        type : String,
        required : true
    },
    isPublished:{
        type : Boolean,
    },
    subject:{
        type : String,
        required : true
    },
},{
    timestamps:true
});

module.exports = mongoose.model("AyetHadis", AyetHadisSchema);