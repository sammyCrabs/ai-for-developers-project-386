import { Badge, Container, Group, Text, Title } from "@mantine/core";
import { useEffect, useState } from "react";
import { health } from "./client/sdk.gen.ts";

type Status = "loading" | "ok" | "error";

export default function App() {
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    health()
      .then(({ data }) => setStatus(data?.status === "ok" ? "ok" : "error"))
      .catch(() => setStatus("error"));
  }, []);

  return (
    <Container size="sm" py="xl">
      <Title order={1}>Календарь звонков</Title>
      <Group mt="md">
        <Text>API:</Text>
        <Badge color={status === "ok" ? "green" : status === "error" ? "red" : "gray"}>
          {status}
        </Badge>
      </Group>
    </Container>
  );
}
