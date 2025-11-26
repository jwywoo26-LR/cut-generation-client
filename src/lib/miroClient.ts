/**
 * Miro API Client - TypeScript/Next.js
 * For uploading generated images to Miro boards
 */

export interface MiroUploadResult {
  id: string;
  type: string;
  position: { x: number; y: number };
  url?: string;
}

export interface MiroImageItem {
  imageUrl: string;
  title?: string;
  x: number;
  y: number;
  width?: number;
}

export interface MiroBoardInfo {
  id: string;
  name: string;
  description?: string;
}

export class MiroClient {
  private baseUrl = 'https://api.miro.com/v2';
  private accessToken: string;
  private headers: Record<string, string>;

  constructor(accessToken?: string) {
    this.accessToken = accessToken || process.env.MIRO_TOKEN || '';

    if (!this.accessToken) {
      throw new Error('MIRO_TOKEN must be set in environment variables');
    }

    this.headers = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Create a new board
   */
  async createBoard(name: string, description?: string): Promise<MiroBoardInfo> {
    const url = `${this.baseUrl}/boards`;

    const payload: Record<string, unknown> = {
      name,
      description: description || `Created by image generation at ${new Date().toISOString()}`,
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create board: ${response.status} - ${errorText}`);
      }

      const board = await response.json();
      console.log(`✅ Created Miro board: ${board.name} (${board.id})`);
      return board;
    } catch (error) {
      console.error('Failed to create board:', error);
      throw error;
    }
  }

  /**
   * Get board information
   */
  async getBoardInfo(boardId: string): Promise<MiroBoardInfo> {
    const url = `${this.baseUrl}/boards/${boardId}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get board info: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get board info:', error);
      throw error;
    }
  }

  /**
   * Upload image to Miro board from URL
   */
  async uploadImageFromUrl(
    boardId: string,
    imageUrl: string,
    position: { x: number; y: number } = { x: 0, y: 0 },
    title?: string,
    width?: number
  ): Promise<MiroUploadResult> {
    const url = `${this.baseUrl}/boards/${boardId}/images`;

    const payload: Record<string, unknown> = {
      data: {
        url: imageUrl,
        title: title || 'Generated Image',
      },
      position: {
        x: position.x,
        y: position.y,
        origin: 'center',
      },
    };

    if (width) {
      payload.geometry = { width };
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to upload image to Miro: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to upload image to Miro:', error);
      throw error;
    }
  }

  /**
   * Upload multiple images to Miro board in a grid layout
   */
  async uploadImagesGrid(
    boardId: string,
    images: Array<{ imageUrl: string; title?: string }>,
    options: {
      startX?: number;
      startY?: number;
      imageWidth?: number;
      imageHeight?: number;
      columns?: number;
      spacing?: number;
    } = {}
  ): Promise<MiroUploadResult[]> {
    const {
      startX = 0,
      startY = 0,
      imageWidth = 300,
      imageHeight = 400,
      columns = 5,
      spacing = 20,
    } = options;

    const results: MiroUploadResult[] = [];

    for (let i = 0; i < images.length; i++) {
      const col = i % columns;
      const row = Math.floor(i / columns);

      const x = startX + col * (imageWidth + spacing);
      const y = startY + row * (imageHeight + spacing);

      try {
        const result = await this.uploadImageFromUrl(
          boardId,
          images[i].imageUrl,
          { x, y },
          images[i].title,
          imageWidth
        );
        results.push(result);
        console.log(`✅ Uploaded image ${i + 1}/${images.length} to Miro`);
      } catch (error) {
        console.error(`❌ Failed to upload image ${i + 1}:`, error);
        results.push({
          id: '',
          type: 'error',
          position: { x, y },
        });
      }

      // Rate limiting - Miro has API rate limits
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    return results;
  }

  /**
   * Create a text label on the board
   */
  async createTextLabel(
    boardId: string,
    text: string,
    position: { x: number; y: number },
    width?: number
  ): Promise<MiroUploadResult> {
    const url = `${this.baseUrl}/boards/${boardId}/texts`;

    const payload: Record<string, unknown> = {
      data: {
        content: text,
      },
      position: {
        x: position.x,
        y: position.y,
        origin: 'center',
      },
    };

    if (width) {
      payload.geometry = { width };
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create text label: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to create text label:', error);
      throw error;
    }
  }

  /**
   * Upload images in a table-like layout with row labels
   * Similar to the Python MiroGenerationUploader
   */
  async uploadImagesAsTable(
    boardId: string,
    images: Array<{
      imageUrl: string;
      rowLabel: string;
      columnIndex: number;
      title?: string;
    }>,
    options: {
      startX?: number;
      startY?: number;
      imageWidth?: number;
      imageHeight?: number;
      rowSpacing?: number;
      columnSpacing?: number;
      labelWidth?: number;
    } = {}
  ): Promise<{ images: MiroUploadResult[]; labels: MiroUploadResult[] }> {
    const {
      startX = 0,
      startY = 0,
      imageWidth = 300,
      imageHeight = 400,
      rowSpacing = 50,
      columnSpacing = 20,
      labelWidth = 200,
    } = options;

    // Group images by row label
    const rowsMap = new Map<string, typeof images>();
    for (const img of images) {
      if (!rowsMap.has(img.rowLabel)) {
        rowsMap.set(img.rowLabel, []);
      }
      rowsMap.get(img.rowLabel)!.push(img);
    }

    const imageResults: MiroUploadResult[] = [];
    const labelResults: MiroUploadResult[] = [];

    let currentY = startY;
    const rowLabels = Array.from(rowsMap.keys()).sort();

    for (const rowLabel of rowLabels) {
      const rowImages = rowsMap.get(rowLabel)!;

      // Create row label
      try {
        const labelResult = await this.createTextLabel(
          boardId,
          rowLabel,
          { x: startX - labelWidth / 2 - 50, y: currentY },
          labelWidth
        );
        labelResults.push(labelResult);
      } catch (error) {
        console.error(`Failed to create label for ${rowLabel}:`, error);
      }

      // Sort images by column index
      rowImages.sort((a, b) => a.columnIndex - b.columnIndex);

      // Upload images in this row
      for (const img of rowImages) {
        const x = startX + img.columnIndex * (imageWidth + columnSpacing);
        const y = currentY;

        try {
          const result = await this.uploadImageFromUrl(
            boardId,
            img.imageUrl,
            { x, y },
            img.title || `${rowLabel}_col${img.columnIndex}`,
            imageWidth
          );
          imageResults.push(result);
          console.log(`✅ Uploaded ${rowLabel} col ${img.columnIndex} to Miro`);
        } catch (error) {
          console.error(`❌ Failed to upload ${rowLabel} col ${img.columnIndex}:`, error);
        }

        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      currentY += imageHeight + rowSpacing;
    }

    return { images: imageResults, labels: labelResults };
  }
}
