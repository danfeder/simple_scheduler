import { spawn } from 'child_process';
import path from 'path';
import { Class, GradeLevel, Conflict, DayOfWeek } from 'shared/types';
import fs from 'fs';
import { StorageService } from './storage';

export class PythonPdfParser {
  private storage: StorageService;

  constructor() {
    this.storage = new StorageService();
  }

  async parseSchedule(pdfBuffer: Buffer): Promise<Class[]> {
    return new Promise((resolve, reject) => {
      try {
        // Get absolute paths
        const rootDir = path.resolve(__dirname, '../..');
        const pythonDir = path.join(rootDir, 'python');
        const tempFile = path.join(rootDir, 'temp.pdf');
        const parserScript = path.join(pythonDir, 'pdf_parser/parser.py');

        console.log('Root directory:', rootDir);
        console.log('Python directory:', pythonDir);
        console.log('Parser script path:', parserScript);

        // Verify directories and script exist
        if (!fs.existsSync(pythonDir)) {
          throw new Error(`Python directory not found at: ${pythonDir}`);
        }
        if (!fs.existsSync(parserScript)) {
          throw new Error(`Python parser script not found at: ${parserScript}`);
        }

        console.log('Writing PDF to temp file:', tempFile);
        fs.writeFileSync(tempFile, pdfBuffer);
        console.log('PDF file size:', fs.statSync(tempFile).size, 'bytes');

        // Set PYTHONPATH to include our Python directory
        const env = {
          ...process.env,
          PYTHONPATH: pythonDir
        };

        console.log('Spawning Python process with script:', parserScript);
        const pythonProcess = spawn('python3', [
          parserScript,
          tempFile,
          '--debug'
        ], { env });

        let outputData = '';
        let errorData = '';

        pythonProcess.stdout.on('data', (data) => {
          const chunk = data.toString();
          console.log('Python stdout:', chunk);
          outputData += chunk;
        });

        pythonProcess.stderr.on('data', (data) => {
          const chunk = data.toString();
          console.error('Python stderr:', chunk);
          errorData += chunk;
        });

        pythonProcess.on('error', (error) => {
          console.error('Failed to start Python process:', error);
          reject(new Error(`Failed to start Python process: ${error.message}`));
        });

        pythonProcess.on('close', async (code) => {
          console.log('Python process exited with code:', code);
          
          // Clean up temp file
          try {
            fs.unlinkSync(tempFile);
            console.log('Cleaned up temp file');
          } catch (cleanupError) {
            console.error('Failed to clean up temp file:', cleanupError);
          }

          if (code !== 0) {
            reject(new Error(`Python process exited with code ${code}: ${errorData}`));
            return;
          }

          try {
            console.log('Parsing Python output:', outputData);
            const parsedData = JSON.parse(outputData);
            if (!parsedData.classes || !Array.isArray(parsedData.classes)) {
              throw new Error('No classes found in parser output');
            }

            // Save all classes at once
            const savedClasses = await this.storage.saveClasses(parsedData.classes);
            resolve(savedClasses);
          } catch (parseError) {
            console.error('Failed to parse Python output:', parseError);
            reject(new Error(`Failed to parse Python output: ${parseError instanceof Error ? parseError.message : String(parseError)}`));
          }
        });
      } catch (error) {
        console.error('Parser error:', error);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }
} 