import * as ff from '@google-cloud/functions-framework';

import { helloworldCallback, rbotCallback } from "./apps"

ff.http('healthz', (req: ff.Request, res: ff.Response) => {
  res.send('OK');
});

ff.http('helloworld', helloworldCallback);

ff.http('rbot', rbotCallback);