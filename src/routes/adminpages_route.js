const express = require("express");
const router = express.Router();
const { validationResult, body } = require('express-validator');
const Page = require("../models/page");

// Get pages index
router.get('/', async (req, res) => {
    try {
        const pages = await Page.find({}).sort({ sorting: 1 }).exec();
        res.render('admin/pages.ejs', {
            pages: pages
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

// Get add page
router.get('/add-page', function (req, res) {
    var title = "";
    var slug = "";
    var content = "";

    res.render('admin/add_page', {
        title: title,
        slug: slug,
        content: content
    });

});

// Middleware kiểm tra các trường của request
const validateFields = [
    body('title').notEmpty().withMessage('Title must have a value.'),
    body('content').notEmpty().withMessage('Content must have a value.')
];

// Xử lý POST request
router.post('/add-page', validateFields, async function (req, res) {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.render('admin/add_page', {
            errors: errors.array(),
            title: req.body.title,
            slug: req.body.slug,
            content: req.body.content
        });
    }

    var title = req.body.title;
    var slug = req.body.slug.replace(/\s+/g, '-').toLowerCase();
    if (slug == "") {
        slug = title.replace(/\s+/g, '-').toLowerCase();
    }
    var content = req.body.content;

    try {
        const page = await Page.findOne({ slug: slug });
        if (page) {
            req.flash('danger', 'Page slug exists, choose another.');
            res.render('admin/add_page', {
                title: title,
                slug: slug,
                content: content
            });
        } else {
            const newPage = new Page({
                title: title,
                slug: slug,
                content: content,
                sorting: 100
            });

            await newPage.save();

            const pages = await Page.find({}).sort({ sorting: 1 });
            req.app.locals.pages = pages;
            req.flash('success', 'Page added!');
            res.redirect('/admin/pages');
        }
    } catch (err) {
        console.log(err);
        // Xử lý lỗi tại đây nếu cần
    }
});

// Sort pages function
async function sortPages(ids, callback) {
    const updatePagePromises = ids.map(async (id, index) => {
        try {
            const page = await Page.findById(id);
            page.sorting = index + 1;
            await page.save();
        } catch (err) {
            console.log(err);
        }
    });

    await Promise.all(updatePagePromises);
    callback();
}

// Post reorder page
router.post('/reorder-pages', async function (req, res) {
    var ids = req.body['id[]'];

    await sortPages(ids, async function () {
        try {
            const pages = await Page.find({}).sort({ sorting: 1 }).exec();
            req.app.locals.pages = pages;
        } catch (err) {
            console.log(err);
        }
    });

});

module.exports = router;
