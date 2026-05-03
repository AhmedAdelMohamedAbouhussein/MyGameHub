import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

const logger = pino(
    {
        level: isDev ? 'debug' : 'info',
        // In production emit pure JSON for log aggregators (Datadog, CloudWatch, etc.)
        // In dev use pino-pretty for human-readable output
        ...(isDev && {
            transport: {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'SYS:HH:MM:ss',
                    ignore: 'pid,hostname',
                    messageFormat: '{msg}',
                },
            },
        }),
    }
);

export default logger;
