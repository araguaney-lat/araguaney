/* El gestor de usuarios de la plataforma.
 *
 * La implementación vive en `/dashboard/admin/users` desde la Fase 5 y ya
 * llamaba a `/v1/studio/*`. Lo que faltaba era exponerla **donde el superadmin
 * la busca**: esta ruta era un marcador de "Próximamente" mientras la pantalla
 * completa existía a un enlace de distancia.
 *
 * Se reexporta en vez de duplicarse. Las dos rutas son la misma pantalla, y lo
 * que cada quien ve lo decide el backend según su rol, no la URL por la que
 * entró.
 */
export { default } from "../../dashboard/admin/users/page"
