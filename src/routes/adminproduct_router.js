var express = require('express');
var router = express.Router();
var mkdirp = require('mkdirp');
var fs = require('fs-extra');
var resizeImg = require('resize-img');
const { body, validationResult } = require('express-validator');


// Get Product model
var Product = require('../models/product');

// Get Category model
var Category = require('../models/category');

/*
 * GET products index
 */
router.get('/', async (req, res) => {
    try {
        const count = await Product.countDocuments();
        const products = await Product.find();
        res.render('admin/products', {
            products: products,
            count: count
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

/*
 * GET add product
 */
router.get('/add-product', async (req, res) => {
    try {
        const categories = await Category.find();
        res.render('admin/add_product', {
            title: "",
            desc: "",
            categories: categories,
            price: ""
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});



router.post('/add-product', async (req, res) => {
    try {
        const imageFile = req.files ? req.files.image : null;

        // Define validation rules using express-validator
        const validationRules = [
            body('title').notEmpty().withMessage('Title must have a value.'),
            body('desc').notEmpty().withMessage('Description must have a value.'),
            body('price').isDecimal().withMessage('Price must have a value.'),
            body('image').custom((value, { req }) => {
                return !!req.files.image; // Ensure an image file is uploaded
            }).withMessage('You must upload an image'),
        ];

        // Run the validation
        await Promise.all(validationRules.map(validation => validation.run(req)));

        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            const categories = await Category.find();
            return res.render('admin/add_product', {
                errors: errors.array(),
                title: req.body.title,
                desc: req.body.desc,
                categories: categories,
                price: parseFloat(req.body.price).toFixed(2)
            });
        } else {
            const title = req.body.title;
            const slug = title.replace(/\s+/g, '-').toLowerCase();
            const desc = req.body.desc;
            const price = parseFloat(req.body.price).toFixed(2);
            const category = req.body.category;

            const existingProduct = await Product.findOne({ slug: slug });

            if (existingProduct) {
                req.flash('danger', 'Product title exists, choose another.');
                const categories = await Category.find();
                return res.render('admin/add_product', {
                    title: title,
                    desc: desc,
                    categories: categories,
                    price: price
                });
            } else {
                const newProduct = new Product({
                    title: title,
                    slug: slug,
                    desc: desc,
                    price: price,
                    category: category,
                    image: imageFile ? imageFile.name : ''
                });

                const savedProduct = await newProduct.save();
                const productID = savedProduct._id;

                // Handle image upload using fs-extra
                fs.ensureDirSync(`public/product_images/${productID}`);

                if (imageFile) {
                    const path = `public/product_images/${productID}/${imageFile.name}`;
                    await imageFile.mv(path);
                }

                req.flash('success', 'Product added!');
                res.redirect('/admin/products');
            }
        }
    } catch (err) {
        console.error(err);
        req.flash('danger', 'Error adding product.');
        res.redirect('/admin/products');
    }
});


module.exports = router;
