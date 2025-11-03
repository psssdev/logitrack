const fs = require('fs');
const path = require('path');

const serviceAccountKeyPath = path.join(process.cwd(), 'service-account-key.json');

if (!fs.existsSync(serviceAccountKeyPath)) {
  console.error('\x1b[31m%s\x1b[0m', 'Erro: Arquivo "service-account-key.json" não encontrado na raiz do projeto.');
  console.log('Por favor, baixe o arquivo de chave de serviço do seu projeto no Firebase Console e salve-o como "service-account-key.json".');
  process.exit(1);
}

try {
  const serviceAccount = fs.readFileSync(serviceAccountKeyPath, 'utf8');
  const buff = Buffer.from(serviceAccount);
  const base64data = buff.toString('base64');
  
  console.log('\x1b[32m%s\x1b[0m', '✅ String Base64 gerada com sucesso!\n');
  console.log('Copie a string abaixo e cole no seu arquivo .env.local na variável FIREBASE_SERVICE_ACCOUNT_B64:\n');
  console.log('\x1b[33m%s\xib[0m', base64data);
  console.log('\n');

} catch (error) {
  console.error('\x1b[31m%s\x1b[0m', 'Falha ao ler ou codificar o arquivo de chave de serviço:');
  console.error(error);
  process.exit(1);
}
