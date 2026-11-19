import "@typespec/http";

using Http;

@service(#{ title: "Call Calendar API" })
namespace CallCalendar;

model Health {
  status: "ok";
}

@route("/health")
@get
op health(): Health;
