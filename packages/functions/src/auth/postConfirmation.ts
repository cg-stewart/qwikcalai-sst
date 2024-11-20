import { PostConfirmationTriggerEvent } from "aws-lambda";
import { DynamoDB } from "aws-sdk";
import { Resource } from "sst";

const dynamoDB = new DynamoDB.DocumentClient();

export async function main(event: PostConfirmationTriggerEvent) {
  const timestamp = new Date().toISOString();
  const userId = event.request.userAttributes.sub;
  const email = event.request.userAttributes.email;

  const params = {
    TableName: Resource.Users.name,
    Item: {
      userId,
      email,
      createdAt: timestamp,
      updatedAt: timestamp,
      status: "ACTIVE",
      preferences: {
        notifications: {
          email: true,
        },
      },
    },
  };

  try {
    await dynamoDB.put(params).promise();
    return event;
  } catch (error) {
    console.error("Error creating user record:", error);
    throw error;
  }
}
