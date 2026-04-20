import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EyeIcon, TrashIcon } from "@heroicons/react/24/outline";

export function GroupRow({
  name,
  id,
  visibility,
  image,
  initials,
  ownerName,
  ownerImage,
  members,
  created,
}: any) {
  return (
    <tr className="hover:bg-surface-container-low/50 transition-colors group">
      <td className="py-4 px-6">
        <div className="flex items-center">
          <Avatar className="w-10 h-10 rounded-lg bg-surface-container-highest mr-3 !rounded-lg border-none text-on-surface-variant font-bold">
            {image && (
              <AvatarImage src={image} alt={name} className="object-cover" />
            )}
            <AvatarFallback className="rounded-lg bg-secondary-container text-on-secondary-container">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-bold text-on-surface">{name}</div>
            <div className="text-xs text-on-surface-variant mt-0.5">
              {visibility} • ID: {id}
            </div>
          </div>
        </div>
      </td>
      <td className="py-4 px-6">
        <div className="flex items-center text-on-surface font-medium">
          <Avatar className="w-6 h-6 mr-2 border-none">
            {ownerImage && (
              <AvatarImage
                src={ownerImage}
                alt={ownerName}
                className="object-cover"
              />
            )}
            <AvatarFallback className="bg-primary-fixed">
              {ownerName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          {ownerName}
        </div>
      </td>
      <td className="py-4 px-6">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-tertiary-container/50 text-on-tertiary-container">
          {members}
        </span>
      </td>
      <td className="py-4 px-6 text-on-surface-variant">{created}</td>
      <td className="py-4 px-6 text-right">
        <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 text-outline hover:text-on-surface bg-surface-container hover:bg-surface-container-high rounded-md transition-colors"
          >
            <EyeIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 text-error hover:text-on-error hover:bg-error rounded-md transition-colors"
          >
            <TrashIcon className="w-4 h-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
