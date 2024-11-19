import { Logger } from "@aws-lambda-powertools/logger";
import { Tracer } from "@aws-lambda-powertools/tracer";
import { Metrics, MetricUnit } from "@aws-lambda-powertools/metrics";
import { Context, APIGatewayProxyEvent } from "aws-lambda";

export module Monitoring {
  const logger = new Logger({
    serviceName: "qwikcalai",
    logLevel: process.env.POWERTOOLS_LOG_LEVEL || "INFO",
  });

  const tracer = new Tracer({
    serviceName: "qwikcalai",
    enabled: true,
    captureHTTPsRequests: true,
  });

  const metrics = new Metrics({
    namespace: "QwikcalAI",
    serviceName: "qwikcalai",
  });

  export const logError = (error: Error, context?: Record<string, any>) => {
    logger.error("Error occurred", {
      error: error.message,
      stack: error.stack,
      ...context,
    });
    metrics.addMetric("Errors", MetricUnit.Count, 1);
  };

  export const trackEvent = (
    name: string,
    value = 1,
    properties?: Record<string, any>,
  ) => {
    logger.info(name, properties);
    metrics.addMetric(name, MetricUnits.Count, value);
  };

  export function handler(
    lambda: (event: APIGatewayProxyEvent, context: Context) => Promise<any>,
  ) {
    return async function (event: APIGatewayProxyEvent, context: Context) {
      const segment = tracer.getSegment();
      const subsegment = segment?.addNewSubsegment("## handler");

      try {
        logger.addContext(context);
        metrics.addMetric("Invocations", MetricUnit.Count, 1);

        const result = await lambda(event, context);
        return {
          statusCode: 200,
          body: JSON.stringify(result),
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": true,
          },
        };
      } catch (error) {
        logError(error as Error);
        return {
          statusCode: 500,
          body: JSON.stringify({
            error:
              error instanceof Error ? error.message : "Internal server error",
          }),
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": true,
          },
        };
      } finally {
        subsegment?.close();
        metrics.publishStoredMetrics();
      }
    };
  }
}
