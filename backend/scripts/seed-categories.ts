import { DataSource } from 'typeorm';
import { CtxhCategory } from '../src/entities/ctxh-category.entity';
import { User } from '../src/entities/user.entity';
import { config } from 'dotenv';

// Load environment variables
config();

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'doanhoi',
    entities: [CtxhCategory, User],
    synchronize: false,
});

async function seedCategories() {
    try {
        await AppDataSource.initialize();
        console.log('🔄 Database connection established');

        const categoryRepository = AppDataSource.getRepository(CtxhCategory);
        const userRepository = AppDataSource.getRepository(User);

        // Find admin user to be the creator
        const adminUser = await userRepository.findOne({
            where: { email: 'admin@doanhoi.com' }
        });

        if (!adminUser) {
            console.log('❌ Admin user not found');
            return;
        }

        console.log(`📍 Found admin user: ${adminUser.email}`);

        // Sample categories
        const sampleCategories = [
            {
                name: 'Hoạt động Tình nguyện',
                description: 'Các hoạt động tình nguyện phục vụ cộng đồng, từ thiện xã hội',
                created_by: adminUser.id
            },
            {
                name: 'Hoạt động Văn nghệ - Thể thao',
                description: 'Các hoạt động văn nghệ, thể thao, giải trí lành mạnh',
                created_by: adminUser.id
            },
            {
                name: 'Hoạt động Học thuật',
                description: 'Các hoạt động học tập, nghiên cứu, thi đua học thuật',
                created_by: adminUser.id
            },
            {
                name: 'Hoạt động Bảo vệ môi trường',
                description: 'Các hoạt động bảo vệ môi trường, phát triển bền vững',
                created_by: adminUser.id
            },
            {
                name: 'Hoạt động Tuyên truyền giáo dục',
                description: 'Các hoạt động tuyên truyền, giáo dục ý thức xã hội',
                created_by: adminUser.id
            }
        ];

        for (const categoryData of sampleCategories) {
            // Check if category exists
            const existingCategory = await categoryRepository.findOne({
                where: { name: categoryData.name }
            });

            if (!existingCategory) {
                const category = categoryRepository.create(categoryData);
                await categoryRepository.save(category);
                console.log(`✅ Created category: ${categoryData.name}`);
            } else {
                console.log(`⏭️  Category already exists: ${categoryData.name}`);
            }
        }

        // Show final count
        const totalCategories = await categoryRepository.count();
        console.log(`\n📊 Total categories: ${totalCategories}`);
        
        // List all categories
        const allCategories = await categoryRepository.find({
            relations: ['creator']
        });

        console.log('\n📋 Categories list:');
        allCategories.forEach((cat, index) => {
            console.log(`   ${index + 1}. ${cat.name}`);
            console.log(`      ${cat.description}`);
        });

    } catch (error) {
        console.error('❌ Error seeding categories:', error);
    } finally {
        await AppDataSource.destroy();
        console.log('🔌 Database connection closed');
    }
}

seedCategories().catch(console.error);