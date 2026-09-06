// 全局异常捕获中间件

export function errorHandler(err, c) {
  console.error('[UNHANDLED ERROR]', err);
  return c.json(
    {
      message: `服务器内部错误: ${err.message}`,
      error: err.message,
    },
    500
  );
}
