import type { RouteObject } from "react-router";
import { Layout } from "./Layout.tsx";
import { HomePage } from "./pages/HomePage.tsx";
import { MessagePage } from "./pages/MessagePage.tsx";

export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      {
        path: "book",
        element: (
          <MessagePage
            title="Каталог типов встреч"
            message="Скоро здесь будет список типов встреч для записи."
          />
        ),
      },
      {
        path: "admin/event-types",
        element: <MessagePage title="Типы встреч" message="Скоро здесь будет управление типами встреч." />,
      },
      {
        path: "admin/bookings",
        element: (
          <MessagePage title="Предстоящие встречи" message="Скоро здесь будет список предстоящих записей." />
        ),
      },
      {
        path: "*",
        element: <MessagePage title="Страница не найдена" message="Проверьте адрес ссылки." />,
      },
    ],
  },
];
