import swaggerJSDoc from 'swagger-jsdoc';

const apiVersion = process.env.npm_package_version ?? '0.1.0';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.1.0',
    info: {
      title: 'TaskFlux API',
      version: apiVersion,
      description: 'REST API documentation for the TaskFlux backend service.',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['src/routes/**/*.ts', 'src/controllers/**/*.ts'],
};

export const swaggerSpec = swaggerJSDoc(options);
