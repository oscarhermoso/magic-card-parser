import { execSync } from 'child_process';

export default function setup() {
  execSync('sh nearley/helper.sh', { stdio: 'inherit' });
}
