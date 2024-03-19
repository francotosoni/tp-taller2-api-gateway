# API Gateway con Middleware Firebase
Este API Gateway actúa como intermediario entre los clientes y otros microservicios, gestionando solicitudes HTTP y comunicándose con servicios externos. Utiliza Firebase como middleware para la autenticación de usuarios.

# Instalación y Uso
* Instala las dependencias del proyecto ejecutando npm install.
* Asegúrate de tener configurada una instancia de Firebase para la autenticación de usuarios.
* Configura las variables de entorno necesarias para la ejecución del servicio, como las URL de los microservicios y la URL de RabbitMQ si es necesario.
* Ejecuta el servicio utilizando el comando node app.js.

# Endpoints Disponibles
## Usuarios
POST /user: Crea un nuevo usuario.
GET /user: Obtiene la información de un usuario.
POST /user/block: Bloquea a un usuario.
POST /user/unblock: Desbloquea a un usuario.
GET /users: Obtiene la lista de usuarios.
POST /user/follow/:followee_uid: Permite a un usuario seguir a otro usuario.
POST /user/unfollow/:followee_uid: Permite a un usuario dejar de seguir a otro usuario.
PUT /user/profile/: Actualiza el perfil de un usuario.
POST /notification/notification-token: Registra el token de notificación de un usuario.
POST /notification/message: Envía un mensaje de notificación a un usuario.
POST /notification/trends: Envía notificaciones sobre tendencias a los usuarios.
GET /notifications/: Obtiene las notificaciones de un usuario.
POST /sms: Envía un mensaje de texto a un número de teléfono.
POST /verify: Verifica un código de verificación de usuario.

## Metricas
GET /metrics/sign-up-password: Obtiene métricas de registro con contraseña.
GET /metrics/sign-up-google: Obtiene métricas de registro con Google.
GET /metrics/sign-in-google: Obtiene métricas de inicio de sesión con Google.
GET /metrics/sign-in-password: Obtiene métricas de inicio de sesión con contraseña.
GET /metrics/block: Obtiene métricas de bloqueo de usuarios.
GET /metrics/change-password: Obtiene métricas de cambio de contraseña.
POST /metric/change-password: Registra una métrica de cambio de contraseña.
GET /metrics/country: Obtiene métricas de país de los usuarios.
GET /metric/health: Verifica el estado de salud del servicio de métricas de usuarios.

## Snaps
POST /snap: Publica un nuevo Snap.
PUT /snap/:snap_id: Actualiza un Snap existente.
POST /snap/block: Bloquea un Snap.
POST /snap/unblock: Desbloquea un Snap.
POST /resnap/: Comparte un Snap.
GET /feed/: Obtiene el feed de Snaps de un usuario.
PUT /snap/like/:snapId: Da "Me gusta" a un Snap.
PUT /snap/dislike/:snapId: Quita el "Me gusta" a un Snap.
DELETE /snap/:snap_id: Elimina un Snap.
GET /snaps: Obtiene una lista de Snaps.
GET /snap/:snap_id: Obtiene información detallada de un Snap.
GET /search/:input_query: Busca Snaps y usuarios por un término de búsqueda.

## Salud del Servicio
GET /user/health: Verifica el estado de salud del servicio de usuarios.
GET /snap/health: Verifica el estado de salud del servicio de Snaps.
GET /notification/health: Verifica el estado de salud del servicio de notificaciones.
