# QwikCalAI 

QwikCalAI is an innovative AI-powered calendar management system that makes scheduling and event management effortless. By leveraging advanced AI capabilities, it transforms natural language inputs and images into structured calendar events, making it easier than ever to keep track of your schedule.

## Features 

- **AI-Powered Event Creation**: Convert natural language descriptions or images into calendar events
- **Smart Event Processing**: Automatically extracts event details including title, time, location, and description
- **Calendar Integration**: Generate and share ICS files compatible with major calendar applications
- **Email Notifications**: Automated event notifications and updates
- **Image Recognition**: Extract event details from images using OpenAI's advanced vision models
- **Real-time Updates**: Instant event modifications and status tracking
- **Premium Features**: Enhanced capabilities for subscribed users

## Tech Stack 

### Backend
- **Framework**: [SST (Serverless Stack)](https://sst.dev/) for infrastructure and deployment
- **Runtime**: Node.js with TypeScript
- **Services**:
  - AWS Lambda for serverless functions
  - DynamoDB for data storage
  - S3 for file storage
  - SES for email delivery
  - SNS for notifications
  - SQS for message queuing
- **AI Integration**: OpenAI GPT-4 Vision for image processing

### Frontend
- **Framework**: Next.js 14 with React
- **Styling**: Tailwind CSS with [shadcn/ui](https://ui.shadcn.com/)
- **State Management**: React Query & Zustand
- **UI Components**: Radix UI primitives
- **Form Handling**: React Hook Form with Zod validation

## Getting Started 

### Prerequisites
- Node.js 20 or later
- AWS Account
- OpenAI API Key
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/cg-stewart/qwikcalai-sst.git
   cd qwikcalai-sst
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up secrets:
   ```bash
   # SST uses AWS Parameter Store to manage secrets
   # Use the following command to set secrets:
   npx sst secrets set OPENAI_API_KEY <your-api-key>
   
   # Other required secrets:
   # - STRIPE_SECRET_KEY
   # - STRIPE_WEBHOOK_SECRET
   # - SES_EMAIL_FROM
   ```

4. Deploy the backend:
   ```bash
   npx sst deploy --stage dev
   ```

5. Start the frontend development server:
   ```bash
   cd packages/frontend
   npm run dev
   ```

## Project Structure 

```
qwikcalai-sst/
├── packages/
│   ├── core/           # Shared business logic and utilities
│   ├── frontend/       # Next.js web application
│   ├── functions/      # Lambda functions and API handlers
│   └── scripts/        # Development and deployment scripts
├── infra/             # Infrastructure configuration
└── sst.config.ts      # SST configuration
```

## Contributing 

While this is primarily a personal project, contributions are welcome! Please feel free to submit issues and pull requests. Note that this project is released under the AGPL-3.0 license, which requires any modifications or derivative works to be open-sourced under the same license terms.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License 

This project is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0). This means:

- You can view, use, and modify the code for personal use
- If you distribute the code or host it as a service, you must:
  - Make your source code available under the same license
  - Include the original copyright and license notices
  - State significant changes made to the code
  - Provide installation instructions

For commercial licensing options or permissions beyond the scope of this license, please contact the author.

## Contact 📧

CG Stewart - [@c_g_stewart](https://twitter.com/c_g_stewart)

Project Link: [https://github.com/cg-stewart/qwikcalai-sst](https://github.com/cg-stewart/qwikcalai-sst)

---

Built with ❤️ using [SST](https://sst.dev)
