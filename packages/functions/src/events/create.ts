import { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { Resource } from "sst";
import { Monitoring } from "@qwikcalai/core/monitoring";
import { Util } from "@qwikcalai/core/util/util";

const sns = new SNSClient({});

export const main = Monitoring.handler(
  async (event: APIGatewayProxyEventV2WithJWTAuthorizer) => {
    const startTime = Date.now();
    const userId = event.requestContext.authorizer.jwt.claims.sub as string;

    try {
      // If this is an image upload
      if (event.isBase64Encoded) {
        const imageData = Buffer.from(event.body || "", "base64");

        // Publish to image processing topic
        await sns.send(
          new PublishCommand({
            TopicArn: Resource.ImageProcessing.arn,
            Message: JSON.stringify({
              type: "image.uploaded",
              userId,
              data: imageData.toString("base64"),
            }),
            MessageAttributes: {
              eventType: {
                DataType: "String",
                StringValue: "image.uploaded",
              },
            },
          })
        );

        Monitoring.trackEvent("ImageUploaded");

        return {
          status: "processing",
          message: "Image uploaded and being processed",
        };
      }

      // Handle normal event creation
      const data = JSON.parse(event.body || "{}");
      const icsKey = await Util.generateICSFile(data);

      // Publish event creation notification
      await sns.send(
        new PublishCommand({
          TopicArn: Resource.Notifications.arn,
          Message: JSON.stringify({
            type: "event.created",
            userId,
            data: {
              ...data,
              icsKey,
            },
          }),
        })
      );

      Monitoring.trackEvent("EventCreated", 1, {
        processingTime: Date.now() - startTime,
      });

      return {
        status: "completed",
        icsKey,
      };
    } catch (error) {
      Monitoring.logError(error as Error, { userId });
      throw error;
    }
  }
);
