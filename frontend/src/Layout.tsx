import { Anchor, AppShell, Container, Group } from "@mantine/core";
import { Link, Outlet } from "react-router";

const ownerLinks = [
  { to: "/admin/event-types", label: "Типы встреч" },
  { to: "/admin/bookings", label: "Предстоящие встречи" },
];

export function Layout() {
  return (
    <AppShell header={{ height: 60 }} padding="md">
      <AppShell.Header>
        <Container size="md" h="100%">
          <Group h="100%" justify="space-between" wrap="nowrap">
            <Anchor component={Link} to="/" fw={700} c="inherit" underline="never">
              Календарь звонков
            </Anchor>
            <Group gap="md" component="nav">
              {ownerLinks.map(({ to, label }) => (
                <Anchor key={to} component={Link} to={to} size="sm">
                  {label}
                </Anchor>
              ))}
            </Group>
          </Group>
        </Container>
      </AppShell.Header>
      <AppShell.Main>
        <Container size="md">
          <Outlet />
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
