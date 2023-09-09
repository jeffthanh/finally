const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Category = require('../models/category');

// Middleware xử lý lỗi toàn cục
router.use(function (err, req, res, next) {
    console.error(err);
    res.status(500).send('Internal Server Error');
});

// GET category index
router.get('/', async (req, res, next) => {
    try {
        const categories = await Category.find().exec();
        res.render('admin/categories', {
            categories: categories
        });
    } catch (err) {
        next(err);
    }
});

// GET add category
router.get('/add-category', (req, res) => {
    res.render('admin/add_category', {
        title: ''
    });
});

// POST add category
router.post('/add-category', [
    body('title').notEmpty().withMessage('Title must have a value.')
], async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        res.render('admin/add_category', {
            errors: errors.array(),
            title: req.body.title
        });
    } else {
        const title = req.body.title;
        const slug = title.replace(/\s+/g, '-').toLowerCase();

        try {
            const category = await Category.findOne({ slug });

            if (category) {
                req.flash('danger', 'Category title exists, choose another.');
                res.render('admin/add_category', {
                    title
                });
            } else {
                const newCategory = new Category({
                    title,
                    slug
                });

                await newCategory.save();

                const categories = await Category.find();

                req.app.locals.categories = categories;
                req.flash('success', 'Category added!');
                res.redirect('/admin/categories');
            }
        } catch (err) {
            next(err);
        }
    }
});

/*
 * GET edit category
 */
router.get('/edit-category/:id', async (req, res) => {
    try {
        const category = await Category.findById(req.params.id).exec();
        if (!category) {
            return res.status(404).send('Category not found'); // Handle category not found
        }

        res.render('admin/edit_category', {
            title: category.title,
            id: category._id
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

/*
 * POST edit category
 */
router.post('/edit-category/:id', async (req, res) => {
    try {
        const title = req.body.title;
        const slug = title.replace(/\s+/g, '-').toLowerCase();
        const id = req.params.id;

        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            const category = await Category.findById(id).exec(); // Retrieve the category for rendering
            res.render('admin/edit_category', {
                errors: errors.array(),
                title: title,
                id: id,
                category: category
            });
        } else {
            const existingCategory = await Category.findOne({ slug: slug, _id: { $ne: id } }).exec();
            if (existingCategory) {
                req.flash('danger', 'Category title exists, choose another.');
                const category = await Category.findById(id).exec(); // Retrieve the category for rendering
                res.render('admin/edit_category', {
                    title: title,
                    id: id,
                    category: category
                });
            } else {
                const category = await Category.findById(id).exec();
                if (!category) {
                    return res.status(404).send('Category not found'); // Handle category not found
                }

                category.title = title;
                category.slug = slug;

                await category.save();

                const categories = await Category.find().exec();
                req.app.locals.categories = categories;

                req.flash('success', 'Category edited!');
                res.redirect('/admin/categories/');
            }
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});
/*
 * GET delete category
 */
router.get('/delete-category/:id', async (req, res) => {
    try {
        const categoryId = req.params.id;

        // Xóa danh mục dựa trên ID
        await Category.findByIdAndRemove(categoryId);

        // Lấy lại danh sách danh mục sau khi xóa
        const categories = await Category.find().exec();

        // Cập nhật danh sách danh mục trong ứng dụng
        req.app.locals.categories = categories;

        req.flash('success', 'Category deleted!');
        res.redirect('/admin/categories/');
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;
