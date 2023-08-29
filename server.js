const express = require('express');
const app = express();
const configViewEngine = require('./src/config/viewEngine');
const dotenv = require("dotenv");
dotenv.config();
const mongoose = require('mongoose');
const pages = require("./src/routes/pages_route");
const adminpages = require("./src/routes/adminpages_route");

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URL)
    .then(() => {
        console.log("Connected to MongoDB");
    })
    .catch((error) => {
        console.error("Failed to connect to MongoDB:", error);
    });

const port = process.env.PORT || 8000;
configViewEngine(app);


// Set router
app.use('/', pages);
app.use('/admin/pages', adminpages);
app.listen(port, () => {
    console.log(`Server app listening on port ${port}`)
});
