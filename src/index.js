const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory metadata store (in production, use a database)
const fileMetadata = new Map();

// Helper function to get file metadata
const getFileMetadata = (filepath) => {
    const stats = fs.statSync(filepath);
    return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        type: path.extname(filepath).slice(1) || 'unknown'
    };
};

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Routes
app.post('/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Store file metadata
        const metadata = {
            ...getFileMetadata(req.file.path),
            originalName: req.file.originalname,
            customMetadata: req.body.metadata ? JSON.parse(req.body.metadata) : {}
        };
        fileMetadata.set(req.file.filename, metadata);

        logger.info(`File uploaded: ${req.file.filename}`);
        res.json({
            message: 'File uploaded successfully',
            filename: req.file.filename,
            metadata
        });
    } catch (error) {
        logger.error('Upload error:', error);
        res.status(500).json({ error: 'Error uploading file' });
    }
});

app.get('/files', (req, res) => {
    try {
        const uploadDir = 'uploads';
        if (!fs.existsSync(uploadDir)) {
            return res.json([]);
        }
        const files = fs.readdirSync(uploadDir);

        // Return files with their metadata
        const filesWithMetadata = files.map(filename => ({
            filename,
            ...fileMetadata.get(filename)
        }));

        res.json(filesWithMetadata);
    } catch (error) {
        logger.error('Error listing files:', error);
        res.status(500).json({ error: 'Error listing files' });
    }
});

app.get('/files/search', (req, res) => {
    try {
        const { query, type, minSize, maxSize, dateFrom, dateTo } = req.query;
        const uploadDir = 'uploads';

        if (!fs.existsSync(uploadDir)) {
            return res.json([]);
        }

        const files = fs.readdirSync(uploadDir);
        const results = files
            .map(filename => ({
                filename,
                ...fileMetadata.get(filename)
            }))
            .filter(file => {
                // Search by filename or custom metadata
                if (query && !file.filename.toLowerCase().includes(query.toLowerCase()) &&
                    !JSON.stringify(file.customMetadata).toLowerCase().includes(query.toLowerCase())) {
                    return false;
                }

                // Filter by file type
                if (type && file.type !== type) {
                    return false;
                }

                // Filter by size
                if (minSize && file.size < parseInt(minSize)) {
                    return false;
                }
                if (maxSize && file.size > parseInt(maxSize)) {
                    return false;
                }

                // Filter by date
                if (dateFrom && new Date(file.created) < new Date(dateFrom)) {
                    return false;
                }
                if (dateTo && new Date(file.created) > new Date(dateTo)) {
                    return false;
                }

                return true;
            });

        res.json(results);
    } catch (error) {
        logger.error('Search error:', error);
        res.status(500).json({ error: 'Error searching files' });
    }
});

app.get('/files/:filename/metadata', (req, res) => {
    try {
        const filename = req.params.filename;
        const filepath = path.join(__dirname, '..', 'uploads', filename);

        if (!fs.existsSync(filepath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        const metadata = fileMetadata.get(filename);
        if (!metadata) {
            return res.status(404).json({ error: 'File metadata not found' });
        }

        res.json(metadata);
    } catch (error) {
        logger.error('Metadata error:', error);
        res.status(500).json({ error: 'Error retrieving file metadata' });
    }
});

app.patch('/files/:filename/metadata', (req, res) => {
    try {
        const filename = req.params.filename;
        const filepath = path.join(__dirname, '..', 'uploads', filename);

        if (!fs.existsSync(filepath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        const currentMetadata = fileMetadata.get(filename);
        if (!currentMetadata) {
            return res.status(404).json({ error: 'File metadata not found' });
        }

        // Update only the provided metadata fields
        const updatedMetadata = {
            ...currentMetadata,
            customMetadata: {
                ...currentMetadata.customMetadata,
                ...req.body
            }
        };

        fileMetadata.set(filename, updatedMetadata);
        logger.info(`Updated metadata for file: ${filename}`);
        res.json(updatedMetadata);
    } catch (error) {
        logger.error('Metadata update error:', error);
        res.status(500).json({ error: 'Error updating file metadata' });
    }
});

app.get('/download/:filename', (req, res) => {
    try {
        const filename = req.params.filename;
        const filepath = path.join(__dirname, '..', 'uploads', filename);

        if (!fs.existsSync(filepath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        res.download(filepath);
    } catch (error) {
        logger.error('Download error:', error);
        res.status(500).json({ error: 'Error downloading file' });
    }
});

app.delete('/files/:filename', (req, res) => {
    try {
        const filename = req.params.filename;
        const filepath = path.join(__dirname, '..', 'uploads', filename);

        if (!fs.existsSync(filepath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        fs.unlinkSync(filepath);
        fileMetadata.delete(filename); // Remove metadata
        logger.info(`File deleted: ${filename}`);
        res.json({ message: 'File deleted successfully' });
    } catch (error) {
        logger.error('Delete error:', error);
        res.status(500).json({ error: 'Error deleting file' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    try {
        // Check if uploads directory exists, create if it doesn't
        const uploadDir = path.join(__dirname, '..', 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
            logger.info('Created uploads directory for health check');
        }
        
        res.status(200).json({ 
            status: 'healthy',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Health check error:', error);
        res.status(500).json({ status: 'unhealthy', error: error.message });
    }
});

app.listen(port, () => {
    logger.info(`Server running on port ${port}`);
}); 