const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const session = require("express-session");
const { body, validationResult } = require('express-validator'); // Sử dụng destructuring
const adminpages = require("../routes/adminpages_route");
const admincategory = require("../routes/admincategory_router");
const fileUpload = require('express-fileupload');
const adminProducts = require('../routes/adminproduct_router');
const  products = require("../routes/products_router")
const Page = require("../models/page")
const Category = require("../models/category")
const configViewEngine = (app) => {
    //config static files
    app.use(express.static(path.join('src', 'public')));
    //config template engine
    app.set('views', path.join('src', 'views'));
    app.set('view engine', 'ejs');
    app.use(bodyParser.urlencoded({ extended: false }));

    // Express fileUpload middleware
    app.use(fileUpload());


    // Set global errors variable
    app.locals.errors = null;
    // parse application/json
    app.use(bodyParser.json())

    app.use(session({
        secret: 'keyboard cat',
        resave: false,
        saveUninitialized: true,
        cookie: { secure: true }
    }));
    app.post('/your-route', [
        // Kiểm tra field 'name' không được để trống
        body('name').notEmpty().withMessage('Name is required'),
        // Thêm các kiểm tra khác cho các field khác nếu cần
    ], (req, res) => {
        // Kiểm tra xem có lỗi không
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            // Nếu có lỗi, xử lý lỗi ở đây (ví dụ: trả về thông báo lỗi)
            const errorMessages = errors.array().map(error => error.msg);
            return res.status(400).json({ errors: errorMessages });
        }

        // Nếu không có lỗi, xử lý dữ liệu và thực hiện hành động cần thiết
        // ...
    });
    // Get all pages to pass to header.ejs
    Page.find({}).sort({ sorting: 1 }).then((pages) => {
        app.locals.pages = pages;
    }).catch((err) => {
        console.error(err);
        // Xử lý lỗi nếu cần
    });
    // Get all categories to pass to header.ejs
    Category.find({}).sort({ sorting: 1 }).then((categories) => {
        app.locals.categories = categories;
    }).catch((err) => {
        console.error(err);
        // Xử lý lỗi nếu cần
    });


    // Serve static files from the 'public' directory
    app.use(express.static('public'));

    app.use(require('connect-flash')());
    app.use(function (req, res, next) {
        res.locals.messages = require('express-messages')(req, res);
        next();
    });
    app.use('/admin/pages', adminpages);
    app.use('/admin/categories', admincategory);
    app.use('/admin/products', adminProducts);
    app.use('/products', products);
}

module.exports = configViewEngine;
