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

                // Create the product image directory
                const productImageDir = `src/public/product_images/${productID}`;

                // Use fs-extra to ensure the directory exists
                await fs.ensureDir(productImageDir);

                if (imageFile) {
                    const imagePath = `${productImageDir}/${imageFile.name}`;
                    await imageFile.mv(imagePath);
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


//edit product get
router.get('/edit-product/:id', async (req, res) => {
    try {
        const errors = req.session.errors;
        req.session.errors = null;

        const categories = await Category.find();
        const product = await Product.findById(req.params.id);

        if (!product) {
            console.log('Product not found');
            return res.redirect('/admin/products');
        }

        const galleryDir = `src/public/product_images/${product._id}/gallery`;

        // Kiểm tra và tạo thư mục "gallery" nếu không tồn tại
        if (!fs.existsSync(galleryDir)) {
            fs.mkdirSync(galleryDir);
        }

        // Đọc thư mục và xử lý hình ảnh
        const files = await fs.readdir(galleryDir);

        let galleryImages = null;
        if (files) {
            galleryImages = files;
        }

        res.render('admin/edit_product', {
            title: product.title,
            errors: errors,
            desc: product.desc,
            categories: categories,
            category: product.category.replace(/\s+/g, '-').toLowerCase(),
            price: parseFloat(product.price).toFixed(2),
            image: product.image,
            galleryImages: galleryImages,
            id: product._id
        });
    } catch (err) {
        console.error(err);
        res.redirect('/admin/products');
    }
});

//post edit product
router.post('/edit-product/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const imageFile = req.files ? req.files.image : null;
        const oldImage = req.body.pimage;

        // Validate the request body
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            req.session.errors = errors.array();
            return res.redirect('/admin/products/edit-product/' + id);
        }

        const { title, desc, price, category } = req.body;
        const slug = title.replace(/\s+/g, '-').toLowerCase();

        // Check if the slug exists for other products (excluding the current one)
        const existingProduct = await Product.findOne({ slug: slug, _id: { $ne: id } });

        if (existingProduct) {
            req.flash('danger', 'Product title exists, choose another.');
            return res.redirect('/admin/products/edit-product/' + id);
        }

        const product = await Product.findById(id);

        if (!product) {
            req.flash('danger', 'Product not found.');
            return res.redirect('/admin/products');
        }

        // Update product details
        product.title = title;
        product.slug = slug;
        product.desc = desc;
        product.price = parseFloat(price).toFixed(2);
        product.category = category;

        if (imageFile) {
            if (oldImage) {
                // Remove the old image file if it exists
                await fs.remove('src/public/product_images/' + id + '/' + oldImage);
            }

            // Ensure the existence of the parent directory before creating the subdirectory
            const productImagePath = `src/public/product_images/${id}`;
            await fs.ensureDirSync(productImagePath);

            product.image = imageFile.name;

            const path = `${productImagePath}/${imageFile.name}`;
            await imageFile.mv(path);
        }

        await product.save();

        req.flash('success', 'Product edited!');
        res.redirect('/admin/products/edit-product/' + id);
    } catch (err) {
        console.error(err);
        req.flash('danger', 'Error editing product.');
        res.redirect('/admin/products');
    }
});



//post gallery image

router.post('/product-gallery/:id', async (req, res) => {
    try {
        const productImage = req.files.file;
        const id = req.params.id;
        const path = 'src/public/product_images/' + id + '/gallery/' + productImage.name;
        const thumbsPath = 'src/public/product_images/' + id + '/gallery/' + productImage.name;

        await productImage.mv(path);

        const buffer = await resizeImg(fs.readFileSync(path), { width: 100, height: 100 });
        await fs.writeFileSync(thumbsPath, buffer);

        res.sendStatus(200);
    } catch (err) {
        console.error(err);
        res.sendStatus(500); // Trả về lỗi nếu có lỗi xảy ra trong quá trình xử lý
    }
});


/*
 * GET delete product
 */
router.get('/delete-product/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const path = 'src/public/product_images/' + id;

        // Sử dụng Promise để đảm bảo xóa ảnh trước khi xóa sản phẩm
        await fs.promises.rm(path, { recursive: true });

        // Sử dụng Mongoose để xóa sản phẩm khỏi cơ sở dữ liệu
        const deletedProduct = await Product.findByIdAndRemove(id);

        if (!deletedProduct) {
            req.flash('danger', 'Product not found.');
        } else {
            req.flash('success', 'Product deleted!');
        }

        res.redirect('/admin/products');
    } catch (error) {
        console.error(error);
        req.flash('danger', 'Error deleting product.');
        res.redirect('/admin/products');
    }
});

/*
 * GET delete image
 */
router.get('/delete-image/:image',  async (req, res) => {
    try {
        const originalImage = 'src/public/product_images/' + req.query.id + '/gallery/' + req.params.image;
        const thumbImage = 'src/public/product_images/' + req.query.id + '/gallery/' + req.params.image;

        // Sử dụng Promise để đảm bảo xóa cả ảnh gốc và thumbnail
        await Promise.all([
            fs.promises.rm(originalImage),
            fs.promises.rm(thumbImage)
        ]);

        req.flash('success', 'Image deleted!');
        res.redirect('/admin/products/edit-product/' + req.query.id);
    } catch (error) {
        console.error(error);
        req.flash('danger', 'Error deleting image.');
        res.redirect('/admin/products/edit-product/' + req.query.id);
    }
});

module.exports = router;
