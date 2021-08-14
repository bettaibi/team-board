import { Logger } from "@nestjs/common";
import { 
    MessageBody, 
    SubscribeMessage, 
    WebSocketGateway, 
    WebSocketServer,
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    WsResponse
} from "@nestjs/websockets";
import { Server, Socket } from 'socket.io';
import { SocketEvents } from './events';
import { IMessage } from "src/models/message.model";

interface OnlineUsersModel{
    [roomId: string]: {[userId: string]: {socketId: string, lastSeen?: Date}};
}

@WebSocketGateway({ namespace: 'chat', cors: true })
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect{
    @WebSocketServer()
    server: Server;

    private logger: Logger = new Logger('Socket Gateway');
    private users : OnlineUsersModel = {};

    afterInit(server: Server) {
        this.logger.log('Socket Initialized');
    }

    handleConnection(client: Socket, ...args: any[]) {
        this.logger.log('Client has been Connected');
    }

    JoinNewRoom(roomId: string, userId: string, socketId: string): void{
        const workspace = this.users.hasOwnProperty(roomId);
        if(workspace){
            this.users[roomId] = {...this.users[roomId], [userId]: {socketId}};
        }
        else{
            this.users = {...this.users, [roomId]: {[userId]: {socketId}} };
        }
    }

    leaveRoom(roomId: string, userId: string, socketId: string): void {
        const workspace = this.users.hasOwnProperty(roomId);
        if(workspace){
            this.users[roomId] = {...this.users[roomId], [userId]: {socketId, lastSeen: new Date() }};
        }
    }

    findReceiver(roomId: string, receiverId: string): string{
        const workspace = this.users[roomId];
        if(workspace){
           if(workspace.hasOwnProperty(receiverId)){
               return workspace[receiverId].socketId
           }
           else
           return  "";
        }
        else{ return ""; }
    }

    @SubscribeMessage('joinWorkspace')
    joinWorkspace(client: Socket, payload: { workspaceId:string, userId: string }): void {
        this.JoinNewRoom(payload.workspaceId, payload.userId, client.id);
        client.join(payload.workspaceId);
        this.server.to(payload.workspaceId).emit(SocketEvents.ONLINE_USERS, this.users[payload.workspaceId]);
        this.logger.log(`${payload.userId} has been joined the room ${payload.workspaceId}`)
    }

    @SubscribeMessage('leaveWorkspace')
    leaveWorkspace(client: Socket, payload: { workspaceId: string, userId: string }): void {
        this.leaveRoom(payload.workspaceId, payload.userId, client.id);
        client.leave(payload.workspaceId);
        this.server.to(payload.workspaceId).emit(SocketEvents.ONLINE_USERS, this.users[payload.workspaceId])
        this.logger.log(`${payload.userId} left the room ${payload.workspaceId}`)
    }

    @SubscribeMessage('sendMessage')
    sendMessage(@MessageBody() payload: { workspaceId:string, receiverId: string, data: IMessage }): void {
        const socketId = this.findReceiver(payload.workspaceId, payload.receiverId);
        if(socketId){
            this.server.to(payload.workspaceId).emit(socketId, payload.data);
        }
    }

    handleDisconnect(client: Socket) {
        this.logger.log('Client has been Disconnected');
    }
}