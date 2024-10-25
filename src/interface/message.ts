interface Emoji {
  id: string | null;
  name: string;
}

interface User {
  id: string;
  username: string;
  avatar: string | null;
  discriminator: string;
  public_flags: number;
  flags: number;
  banner: string | null;
  accent_color: number | null;
  global_name: string | null;
  avatar_decoration_data: any | null;
  banner_color: string | null;
  clan: any | null;
}

interface Attachment {
  id: string;
  filename: string;
  size: number;
  url: string;
  proxy_url: string;
  width: number;
  height: number;
  content_type: string;
  content_scan_version: number;
  placeholder: string;
  placeholder_version: number;
  title?: string;
}

interface Component {
  type: number;
  id: number;
  custom_id?: string;
  style?: number;
  label?: string;
  emoji?: Emoji;
  url?: string;
  components?: Component[];
}

interface Reaction {
  emoji: Emoji;
  count: number;
  count_details: {
    burst: number;
    normal: number;
  };
  burst_colors: any[];
  me_burst: boolean;
  burst_me: boolean;
  me: boolean;
  burst_count: number;
}

interface MessageReference {
  type: number;
  channel_id: string;
  message_id: string;
  guild_id?: string;
}

interface IMessage {
  type: number;
  content: string;
  mentions: User[];
  mention_roles: any[];
  attachments: Attachment[];
  embeds: any[];
  timestamp: string;
  edited_timestamp: string | null;
  flags: number;
  components: Component[];
  resolved?: {
    users: Record<string, User>;
    members: Record<string, any>;
    channels: Record<string, any>;
    roles: Record<string, any>;
  };
  id: string;
  channel_id: string;
  author: User;
  pinned: boolean;
  mention_everyone: boolean;
  tts: boolean;
  message_reference?: MessageReference;
  position?: number;
  referenced_message?: IMessage;
  reactions?: Reaction[];
}

type IMessageArray = IMessage[];
export type { IMessage, IMessageArray };