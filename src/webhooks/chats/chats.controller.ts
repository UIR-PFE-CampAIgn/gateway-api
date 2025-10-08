import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
} from '@nestjs/common';
import { ChatsService } from './chats.service';
import { SendMessageDto } from './types';

@Controller('chats')
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  /**
   * GET /chats
   * Get all chats with pagination and filters
   */
  @Get()
  async getAllChats(
    @Query('businessId') businessId: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return await this.chatsService.getAllChats(
      businessId || 'default-business',
      {
        status,
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        search,
      },
    );
  }

  /**
   * GET /chats/:id
   * Get a specific chat details
   */
  @Get(':id')
  async getChatById(@Param('id') id: string) {
    return await this.chatsService.getChatById(id);
  }

  /**
   * GET /chats/:id/messages
   * Get all messages for a chat
   */
  @Get(':id/messages')
  async getMessages(
    @Param('id') chatId: string,
    @Query('limit') limit?: string,
  ) {
    return await this.chatsService.getMessagesByChatId(
      chatId,
      limit ? parseInt(limit) : undefined,
    );
  }

  /**
   * POST /chats/:id/messages
   * Send a message to a chat
   */
  @Post(':id/messages')
  async sendMessage(
    @Param('id') chatId: string,
    @Body() body: { text: string; msg_type?: string },
  ) {
    const dto: SendMessageDto = {
      chat_id: chatId,
      text: body.text,
      msg_type: body.msg_type,
    };
    return await this.chatsService.sendMessage(dto);
  }

  /**
   * PATCH /chats/:id/status
   * Update chat status (open, closed, archived)
   */
  @Patch(':id/status')
  async updateStatus(
    @Param('id') chatId: string,
    @Body('status') status: string,
  ) {
    await this.chatsService.updateChatStatus(chatId, status);
    return { message: 'Chat status updated' };
  }
}
